import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.schemas import DecomposedClaim, RetrievedDocument
from backend.app.utils.key_manager import get_all_keys, get_current_api_key, rotate_api_key

logger = logging.getLogger(__name__)

EXPLANATION_PROMPT = """
You are an expert patent attorney assisting with a prior-art search.
Your task is to explain why the provided retrieved document is relevant to the claim.
CRITICAL: You must NOT hallucinate. Your explanation must ONLY be based on the provided document snippet.
State which claim elements it matches, via which retrieval paths, and provide a one-line rationale.

Original Decomposed Claim:
{claim_text}

Matched Claim Elements:
{matched_elements}

Retrieval Sources:
{retrieval_sources}

Retrieved Document Snippet:
{document_snippet}

Provide a short, 1-2 sentence explanation:
"""


class ExplanationGenerator:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            google_api_key=get_current_api_key(),  # type: ignore
            model="gemini-flash-latest",
            temperature=0,
            max_retries=0,
        )  # type: ignore
        self.prompt = ChatPromptTemplate.from_template(EXPLANATION_PROMPT)
        self.chain = self.prompt | self.llm

    def explain(self, doc: RetrievedDocument, query_claim: DecomposedClaim) -> str:
        if not doc.snippet:
            return "No text available to explain relevance."

        # Format matched elements for prompt
        matched_element_texts = []
        for elem_id in doc.matched_elements:
            elem = next((e for e in query_claim.elements if e.element_id == elem_id), None)
            if elem:
                matched_element_texts.append(f"- {elem_id}: {elem.text}")

        matched_str = "\n".join(matched_element_texts) if matched_element_texts else "None tracked"

        total_attempts = len(get_all_keys()) or 1
        for attempt in range(total_attempts):
            try:
                response = self.chain.invoke(
                    {
                        "claim_text": query_claim.raw_claim_text,
                        "matched_elements": matched_str,
                        "retrieval_sources": ", ".join(doc.retrieval_sources),
                        "document_snippet": doc.snippet,
                    }
                )
                return response.content
            except Exception as e:
                logger.error(f"Explanation generation failed: {e}")
                error_str = str(e).lower()
                if "429" in error_str or "resourceexhausted" in error_str or "quota" in error_str:
                    if attempt < total_attempts - 1:
                        logger.warning("Quota hit, rotating key for explanation...")
                        failed_key = (
                            self.llm.google_api_key.get_secret_value()
                            if hasattr(self.llm.google_api_key, "get_secret_value")
                            else self.llm.google_api_key
                        )
                        rotate_api_key(failed_key)
                        self.llm = ChatGoogleGenerativeAI(
                            google_api_key=get_current_api_key(),  # type: ignore
                            model="gemini-flash-latest",
                            temperature=0,
                            max_retries=0,
                        )  # type: ignore
                        self.chain = self.prompt | self.llm
                        continue
                    return "Explanation omitted due to API quota limits across all keys."

                import traceback

                tb = traceback.format_exc()
                return f"Explanation generation failed: {str(e)}\n\nTraceback:\n{tb}"

        return "Explanation omitted due to API quota limits across all keys."
