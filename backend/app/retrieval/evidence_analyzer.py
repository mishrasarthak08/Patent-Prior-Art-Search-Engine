import json
import logging
import re
from typing import Literal, cast

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.db.models import PatentDocument
from backend.app.db.session import SessionLocal
from backend.app.schemas import (
    ClaimElement,
    DecomposedClaim,
    LimitationEvidence,
    RetrievedDocument,
)
from backend.app.utils.key_manager import get_current_api_key

logger = logging.getLogger(__name__)

EVIDENCE_ANALYSIS_PROMPT = """You are a senior patent attorney conducting an element-by-element prior-art claim analysis.
Examine the patent disclosure and determine whether each claim limitation is disclosed.

CRITICAL INTEGRITY RULES:
1. Do NOT hallucinate. You may ONLY quote text that appears verbatim in the patent text below.
2. If a limitation is not disclosed in the text, you MUST categorize it as "NOT_FOUND".
3. Distinguish carefully between:
   - "DIRECTLY_SUPPORTED": The patent text explicitly and completely discloses all features of the limitation.
   - "PARTIALLY_SUPPORTED": The patent text discloses some, but not all, features of the limitation.
   - "RELATED_DISCLOSURE": The patent discusses analogous or related concepts, but does not disclose this limitation.
   - "NOT_FOUND": No disclosure found in the text.
4. Extract the exact quotation and the passage location (e.g., "Claim 1", "Abstract", "Description [0035]").

Patent Document ID: {doc_id}
Patent Title: {title}
Patent Disclosure:
{patent_text}

Claim Limitations to evaluate:
{limitations_json}

Return strictly a JSON array of objects matching this schema:
[
  {{
    "element_id": "el-1",
    "support_level": "DIRECTLY_SUPPORTED",
    "exact_quote": "verbatim text from patent disclosure",
    "passage_location": "Description [0022]",
    "confidence_score": 0.95,
    "rationale": "Clear factual explanation of disclosure."
  }}
]
"""


class EvidenceAnalyzer:
    def __init__(self):
        self.llm = None
        self._init_llm()

    def _init_llm(self):
        api_key = get_current_api_key()
        if not api_key:
            return
        try:
            self.llm = ChatGoogleGenerativeAI(
                google_api_key=api_key,  # type: ignore
                model="gemini-flash-latest",
                temperature=0.0,
                request_timeout=20.0,
                max_retries=0,
            )
        except Exception as e:
            logger.warning(f"Could not init evidence analyzer LLM: {e}")
            self.llm = None

    def _get_full_patent_text(self, doc_id: str) -> dict:
        db = SessionLocal()
        try:
            doc = db.query(PatentDocument).filter(PatentDocument.id == doc_id).first()
            if doc:
                sections = []
                if doc.abstract:
                    sections.append(f"--- ABSTRACT ---\n{doc.abstract}")
                if doc.claims_list:
                    sections.append("--- CLAIMS ---\n" + "\n".join(doc.claims_list[:4]))
                if doc.description_text:
                    sections.append(f"--- DESCRIPTION ---\n{doc.description_text[:2500]}")
                return {
                    "title": doc.title,
                    "text": "\n\n".join(sections),
                    "full_claims": doc.claims_list or [],
                    "abstract": doc.abstract or "",
                    "description": doc.description_text or "",
                }
        finally:
            db.close()
        return {"title": doc_id, "text": "", "full_claims": [], "abstract": "", "description": ""}

    def _verify_quotation(self, quote: str | None, full_text: str) -> bool:
        """
        Anti-hallucination guardrail: Verifies that the claimed quotation
        actually exists as a substring in the actual patent document.
        """
        if not quote or len(quote.strip()) < 5:
            return False

        # Clean whitespace for comparison
        clean_quote = " ".join(quote.split()).lower()
        clean_doc = " ".join(full_text.split()).lower()

        return clean_quote in clean_doc

    def _deterministic_evidence_mapping(self, element: ClaimElement, full_text_dict: dict) -> LimitationEvidence:
        """
        Deterministic, verifiable rule-based evidence mapper.
        Scans abstract, claims, and description for limitation terminology.
        Guarantees that quotes are 100% verified authentic substrings.
        """
        full_text = full_text_dict["text"]
        tech_terms = [t.lower() for t in element.technical_terms if len(t) > 3]
        if not tech_terms:
            stopwords = {
                "wherein",
                "comprising",
                "further",
                "having",
                "thereof",
                "claim",
                "device",
                "method",
                "present",
                "said",
                "with",
                "from",
            }
            tech_terms = [
                w.lower() for w in re.findall(r"\b[A-Za-z0-9\-]{4,}\b", element.text) if w.lower() not in stopwords
            ]

        matched_terms = [t for t in tech_terms if t in full_text.lower()]
        coverage = len(matched_terms) / len(tech_terms) if tech_terms else 0.0

        support_level: Literal[
            "DIRECTLY_SUPPORTED", "PARTIALLY_SUPPORTED", "RELATED_DISCLOSURE", "AMBIGUOUS", "NOT_FOUND"
        ] = "NOT_FOUND"
        exact_quote = None
        passage_loc = None
        confidence = 0.0
        rationale = f"No disclosure found in document text for limitation {element.element_id}."

        # Search for sentences containing the key terms
        sentences = re.split(r"(?<=[.!?])\s+", full_text)
        best_sentence = None
        max_matches = 0

        for s in sentences:
            s_clean = s.strip()
            s_lower = s_clean.lower()
            m_count = sum(1 for t in tech_terms if t in s_lower)
            if m_count > max_matches:
                max_matches = m_count
                best_sentence = s_clean

        if best_sentence and max_matches >= 2:
            exact_quote = best_sentence[:200]
            confidence = min(0.9, 0.4 + (max_matches / max(len(tech_terms), 1)) * 0.5)

            # Determine passage location
            if "--- ABSTRACT ---" in full_text and exact_quote in full_text_dict.get("abstract", ""):
                passage_loc = "Abstract"
            elif any(exact_quote in c for c in full_text_dict.get("full_claims", [])):
                passage_loc = "Claim 1"
            else:
                passage_loc = "Detailed Description"

            if coverage >= 0.7:
                support_level = "DIRECTLY_SUPPORTED"
                rationale = (
                    f"Document directly anticipates technical features ({', '.join(matched_terms)}) in {passage_loc}."
                )
            elif coverage >= 0.4:
                support_level = "PARTIALLY_SUPPORTED"
                rationale = f"Document partially discloses elements ({', '.join(matched_terms)}), but omits certain limitations."
            else:
                support_level = "RELATED_DISCLOSURE"
                rationale = f"Discloses general concepts ({', '.join(matched_terms)}) in related context."

        is_verified = self._verify_quotation(exact_quote, full_text) if exact_quote else False

        return LimitationEvidence(
            element_id=element.element_id,
            limitation_text=element.text,
            support_level=support_level,
            exact_quote=exact_quote if is_verified else None,
            passage_location=passage_loc,
            verified=is_verified,
            confidence_score=round(confidence, 2),
            rationale=rationale,
        )

    def analyze_limitation(
        self, element_or_text: ClaimElement | str, full_text_or_dict: dict | str
    ) -> LimitationEvidence:
        """
        Analyzes a single limitation against patent disclosure text.
        Accepts either ClaimElement or string, and dict or string.
        """
        if isinstance(element_or_text, str):
            elem = ClaimElement(
                element_id="lim-eval",
                element_type="structural",
                text=element_or_text,
            )
        else:
            elem = element_or_text

        if isinstance(full_text_or_dict, str):
            text_dict = {
                "title": "",
                "text": full_text_or_dict,
                "full_claims": [],
                "abstract": "",
                "description": full_text_or_dict,
            }
        else:
            text_dict = full_text_or_dict

        return self._deterministic_evidence_mapping(elem, text_dict)

    def analyze_document_evidence(
        self, doc: RetrievedDocument, query_claim: DecomposedClaim
    ) -> list[LimitationEvidence]:
        doc_data = self._get_full_patent_text(doc.doc_id)
        full_text = doc_data["text"]

        if not full_text or not self.llm:
            # Execute deterministic mapper
            fallback_chart = [self._deterministic_evidence_mapping(elem, doc_data) for elem in query_claim.elements]
            return fallback_chart

        # Prepare prompt
        limitations_payload = [
            {"element_id": e.element_id, "text": e.text, "type": e.element_type} for e in query_claim.elements
        ]

        prompt = ChatPromptTemplate.from_template(EVIDENCE_ANALYSIS_PROMPT)
        chain = prompt | self.llm

        try:
            response = chain.invoke(
                {
                    "doc_id": doc.doc_id,
                    "title": doc.title,
                    "patent_text": full_text[:4000],
                    "limitations_json": json.dumps(limitations_payload, indent=2),
                }
            )
            content = response.content.strip()
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\n?", "", content)
                content = re.sub(r"\n?```$", "", content)

            parsed = json.loads(content)
            claim_chart: list[LimitationEvidence] = []

            for item in parsed:
                elem_id = item.get("element_id")
                orig_elem = next((e for e in query_claim.elements if e.element_id == elem_id), None)
                if not orig_elem:
                    continue

                raw_quote = item.get("exact_quote")
                # Automated verification against patent text
                verified = self._verify_quotation(raw_quote, full_text)

                claim_chart.append(
                    LimitationEvidence(
                        element_id=elem_id,
                        limitation_text=orig_elem.text,
                        support_level=cast(
                            Literal[
                                "DIRECTLY_SUPPORTED",
                                "PARTIALLY_SUPPORTED",
                                "RELATED_DISCLOSURE",
                                "AMBIGUOUS",
                                "NOT_FOUND",
                            ],
                            item.get("support_level", "NOT_FOUND"),
                        ),
                        exact_quote=raw_quote if verified else None,
                        passage_location=item.get("passage_location"),
                        verified=verified,
                        confidence_score=float(item.get("confidence_score", 0.0)),
                        rationale=item.get("rationale")
                        if verified
                        else f"LLM quote unverified against source text. {item.get('rationale', '')}",
                    )
                )

            # Ensure all elements are represented
            covered_ids = {c.element_id for c in claim_chart}
            for elem in query_claim.elements:
                if elem.element_id not in covered_ids:
                    claim_chart.append(self._deterministic_evidence_mapping(elem, doc_data))

            return claim_chart
        except Exception as e:
            logger.warning(f"LLM evidence analysis failed for {doc.doc_id}: {e}. Using deterministic mapper.")
            return [self._deterministic_evidence_mapping(elem, doc_data) for elem in query_claim.elements]
