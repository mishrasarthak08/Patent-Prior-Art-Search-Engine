import concurrent.futures
import json
import logging
import re
from typing import Literal

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.schemas import ClaimElement, DecomposedClaim
from backend.app.config import settings
from backend.app.utils.key_manager import get_all_keys, get_current_api_key, rotate_api_key

logger = logging.getLogger(__name__)

DECOMPOSITION_SYSTEM_PROMPT = """You are a senior patent attorney and claim analysis specialist.
Your task is to decompose an invention claim into its preamble, transition phrase, and individual technical limitations.

GUIDELINES:
1. Identify the preamble (the statement of the technical field or device being claimed).
2. Identify the transition phrase (typically "comprising", "consisting of", "consisting essentially of", or "characterized in that").
3. Break the body into discrete, atomic limitations.
4. Categorize each limitation: "structural", "functional", "chemical", "numeric", "method_step", or "condition".
5. Extract key technical terms from each limitation.
6. Return strictly valid JSON matching this structure:
{{
    "preamble": "A lithium-ion battery",
    "transition": "comprising",
    "elements": [
        {{
            "element_id": "el-1",
            "text": "verbatim text of limitation 1",
            "element_type": "structural",
            "technical_terms": ["silicon nanoparticles", "carbon matrix"],
            "normalized_concept": "Silicon-carbon composite negative electrode active material"
        }}
    ]
}}
"""

HYDE_PROMPT = """You are a patent examiner and technical literature author.
Write a realistic 2-3 sentence technical passage from a prior-art patent specification or engineering paper that would disclose the following claim limitation:

Limitation: {element_text}
Type: {element_type}

Write solely the hypothetical prior-art passage describing the physical or operational implementation:"""


class QueryUnderstandingPipeline:
    def __init__(self):
        self.api_key = get_current_api_key()
        self.llm = None
        self.hyde_llm = None
        if self.api_key:
            self._init_llms()

    def _init_llms(self):
        current_key = get_current_api_key()
        if not current_key:
            return
        try:
            self.llm = ChatGoogleGenerativeAI(
                google_api_key=current_key,  # type: ignore
                model="gemini-flash-latest",
                temperature=0.0,
                request_timeout=15.0,
                max_retries=0,
            )
            self.hyde_llm = ChatGoogleGenerativeAI(
                google_api_key=current_key,  # type: ignore
                model="gemini-flash-latest",
                temperature=0.7,
                request_timeout=10.0,
                max_retries=0,
            )
        except Exception as e:
            logger.warning(f"Could not initialize Google GenAI LLMs: {e}")
            self.llm = None
            self.hyde_llm = None

    def heuristic_decompose(self, raw_claim: str) -> DecomposedClaim:
        """
        Deterministic, high-fidelity patent parser fallback when LLM is unavailable or times out.
        Identifies preamble, transition, and splits by semicolons, numbered clauses, or conjunctions.
        Computes exact character offsets for each limitation.
        """
        text = raw_claim.strip()
        transition_patterns = [
            r"\bcomprising\b",
            r"\bwhich comprises\b",
            r"\bconsisting of\b",
            r"\bconsisting essentially of\b",
            r"\bincluding\b",
            r"\bcharacterized in that\b",
        ]

        preamble = ""
        transition = "comprising"
        body = text

        for pat in transition_patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                preamble = text[: match.start()].strip(": ,;.")
                transition = match.group(0)
                body = text[match.end() :].strip(": ,;.")
                break

        # Remove leading claim number if present (e.g. "1.", "Claim 1.")
        claim_num_match = re.match(r"^(?:claim\s*)?(\d+)[\.\:]\s*", preamble, re.IGNORECASE)
        claim_number = "1"
        if claim_num_match:
            claim_number = claim_num_match.group(1)
            preamble = preamble[claim_num_match.end() :].strip()

        # Split body into clauses by semicolon, or comma + 'and/wherein'
        raw_clauses = re.split(r";\s*|\.\s+(?=[A-Z])|\band\s+a\b|\band\s+an\b", body)
        elements: list[ClaimElement] = []
        elem_idx = 1

        for clause in raw_clauses:
            clause = clause.strip(" ,;.")
            if not clause or len(clause) < 5:
                continue

            # Compute character offsets if found in raw_claim
            start_char = text.find(clause)
            end_char = start_char + len(clause) if start_char != -1 else None

            # Detect element type
            clause_lower = clause.lower()
            elem_type: Literal["structural", "functional", "chemical", "numeric", "method_step", "condition"] = (
                "structural"
            )
            if any(
                term in clause_lower
                for term in ["method", "step of", "generating", "transmitting", "heating", "mixing", "applying"]
            ):
                elem_type = "method_step"
            elif any(
                term in clause_lower
                for term in ["wt%", "mol%", "nm", "micrometer", "degree", "greater than", "less than", "ratio"]
            ):
                elem_type = "numeric"
            elif any(
                term in clause_lower
                for term in ["oxide", "acid", "salt", "fluoride", "carbonate", "copolymer", "lipid", "formula", "li"]
            ):
                elem_type = "chemical"
            elif any(
                term in clause_lower
                for term in ["configured to", "adapted to", "operable to", "causes", "functions to"]
            ):
                elem_type = "functional"
            else:
                elem_type = "structural"

            # Extract basic technical terms
            tech_terms = [
                word
                for word in re.findall(r"\b[A-Za-z0-9\-]{4,}\b", clause)
                if word.lower() not in {"wherein", "comprising", "further", "having", "thereof"}
            ]

            elements.append(
                ClaimElement(
                    element_id=f"el-{elem_idx}",
                    text=clause,
                    element_type=elem_type,
                    start_char=start_char if start_char != -1 else None,
                    end_char=end_char if start_char != -1 else None,
                    technical_terms=tech_terms[:5],
                    hyde_passage=None,
                    normalized_concept=clause[:80],
                )
            )
            elem_idx += 1

        if not elements:
            elements.append(
                ClaimElement(
                    element_id="el-1",
                    text=text,
                    element_type="structural",
                    start_char=0,
                    end_char=len(text),
                    technical_terms=[],
                    normalized_concept=text[:100],
                )
            )

        return DecomposedClaim(
            raw_claim_text=text,
            preamble=preamble or "A device or method",
            transition=transition,
            claim_number=claim_number,
            elements=elements,
        )

    def decompose_claim(self, raw_claim: str, max_retries: int = 1) -> DecomposedClaim:
        if settings.CONFIDENTIAL_MODE or not self.llm:
            logger.info("Executing zero-egress in-process heuristic decomposition (Confidential Mode active or LLM offline).")
            return self.heuristic_decompose(raw_claim)

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", DECOMPOSITION_SYSTEM_PROMPT),
                ("user", "Claim Text:\n{raw_claim}\n\nRespond with strict JSON."),
            ]
        )
        chain = prompt | self.llm
        total_attempts = max(max_retries + 1, len(get_all_keys()) or 1)

        for attempt in range(total_attempts):
            try:
                executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                future = executor.submit(chain.invoke, {"raw_claim": raw_claim})
                try:
                    response = future.result(timeout=25.0)
                    content = response.content.strip()
                    # Strip markdown code blocks if wrapped
                    if content.startswith("```"):
                        content = re.sub(r"^```(?:json)?\n?", "", content)
                        content = re.sub(r"\n?```$", "", content)

                    data = json.loads(content)
                    raw_elements = data.get("elements", [])
                    elements = []

                    for i, elem in enumerate(raw_elements):
                        elem_text = elem.get("text", "").strip()
                        if not elem_text:
                            continue
                        # Calculate character spans
                        start_char = raw_claim.find(elem_text)
                        end_char = start_char + len(elem_text) if start_char != -1 else None

                        elements.append(
                            ClaimElement(
                                element_id=elem.get("element_id") or f"el-{i + 1}",
                                text=elem_text,
                                element_type=elem.get("element_type", "structural"),
                                start_char=start_char if start_char != -1 else None,
                                end_char=end_char if start_char != -1 else None,
                                technical_terms=elem.get("technical_terms", []),
                                normalized_concept=elem.get("normalized_concept"),
                            )
                        )

                    if elements:
                        return DecomposedClaim(
                            raw_claim_text=raw_claim,
                            preamble=data.get("preamble"),
                            transition=data.get("transition", "comprising"),
                            elements=elements,
                        )
                finally:
                    executor.shutdown(wait=False)
            except Exception as e:
                logger.warning(f"LLM decomposition failed on attempt {attempt}: {e}")
                err_str = str(e).lower()
                if "429" in err_str or "quota" in err_str or "resourceexhausted" in err_str:
                    failed_key = (
                        self.llm.google_api_key.get_secret_value()
                        if hasattr(self.llm.google_api_key, "get_secret_value")
                        else self.llm.google_api_key
                    )
                    rotate_api_key(failed_key)
                    self._init_llms()
                    chain = prompt | self.llm
                    continue

        logger.info("Using fallback claim decomposition via heuristic parser.")
        fallback_res = self.heuristic_decompose(raw_claim)
        if len(fallback_res.elements) == 1:
            fallback_res.elements[0].element_id = "el-fallback"
        return fallback_res

    def generate_hyde_for_element(self, element: ClaimElement) -> str:
        if not self.hyde_llm:
            return f"Technical disclosure of {element.text} with physical structural configuration."

        prompt = ChatPromptTemplate.from_template(HYDE_PROMPT)
        chain = prompt | self.hyde_llm
        try:
            response = chain.invoke({"element_text": element.text, "element_type": element.element_type})
            return response.content.strip()
        except Exception as e:
            logger.debug(f"HyDE generation skipped for {element.element_id}: {e}")
            return f"Prior art disclosing {element.text}"

    def process_claim(self, raw_claim: str) -> DecomposedClaim:
        decomposed = self.decompose_claim(raw_claim)
        logger.info(f"Decomposed claim into {len(decomposed.elements)} elements.")

        # Parallel HyDE generation across elements
        def attach_hyde(elem: ClaimElement):
            elem.hyde_passage = self.generate_hyde_for_element(elem)

        executor = concurrent.futures.ThreadPoolExecutor(max_workers=min(len(decomposed.elements), 4))
        futures = [executor.submit(attach_hyde, elem) for elem in decomposed.elements]
        try:
            concurrent.futures.wait(futures, timeout=20.0)
        finally:
            executor.shutdown(wait=False)

        return decomposed
