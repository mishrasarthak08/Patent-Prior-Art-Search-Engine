import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.schemas import DecomposedClaim, RetrievedDocument

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
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
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
            if "429" in str(e) or "ResourceExhausted" in str(e):
                return "Explanation omitted due to API quota limits."
            return f"Explanation generation failed: {str(e)}"
