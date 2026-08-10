import logging

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import ValidationError

from backend.app.schemas import ClaimElement, DecomposedClaim

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prompt for decomposition
DECOMPOSITION_PROMPT = """
You are an expert patent attorney. Your task is to decompose a raw patent claim into its atomic technical limitations.
Break down the claim into logical, searchable elements.

Raw Claim Text:
{raw_claim}

Provide the output strictly matching the JSON schema. Ensure each element has a unique element_id.
"""

HYDE_PROMPT = """
You are a technical expert. I will provide you with a specific element from a patent claim.
Your task is to write a hypothetical passage from a prior-art document that would satisfy or anticipate this element.
Write it exactly as it would appear in a real engineering document or patent description.

Claim Element: {element_text}
Element Type: {element_type}

Hypothetical Prior Art Passage:
"""


class QueryUnderstandingPipeline:
    def __init__(self):
        # Using Gemini. The prompt structure expects structured JSON fallback or native function calling.
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, request_timeout=15.0)
        self.hyde_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.7, request_timeout=10.0)

        self.decomposition_parser = PydanticOutputParser(pydantic_object=DecomposedClaim)
        self.decomposition_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", DECOMPOSITION_PROMPT),
                (
                    "user",
                    "Please format your output according to the schema:\n{format_instructions}",
                ),
            ]
        )

    def decompose_claim(self, raw_claim: str, max_retries: int = 1) -> DecomposedClaim:
        """Decomposes a raw claim with retry logic for schema validation (fails safely)."""
        # Using .with_structured_output if model supports it, but PydanticOutputParser is more universally compatible
        chain = self.decomposition_prompt | self.llm | self.decomposition_parser

        for attempt in range(max_retries + 1):
            try:
                result = chain.invoke(
                    {
                        "raw_claim": raw_claim,
                        "format_instructions": self.decomposition_parser.get_format_instructions(),
                    }
                )
                return result
            except ValidationError as e:
                logger.warning(f"Validation error on attempt {attempt}: {e}")
                if attempt == max_retries:
                    logger.error("Max retries reached for claim decomposition.")
                    return DecomposedClaim(
                        raw_claim_text=raw_claim,
                        elements=[
                            ClaimElement(
                                element_id="el-fallback",
                                text=raw_claim,
                                element_type="structural",
                            )
                        ],
                    )
            except Exception as e:
                logger.warning(f"API Error during decomposition: {e}")
                if "429" in str(e) or attempt == max_retries:
                    logger.error("Fallback triggered due to API limits or max retries.")
                    return DecomposedClaim(
                        raw_claim_text=raw_claim,
                        elements=[
                            ClaimElement(
                                element_id="el-fallback",
                                text=raw_claim,
                                element_type="structural",
                            )
                        ],
                    )

        return DecomposedClaim(
            raw_claim_text=raw_claim,
            elements=[ClaimElement(element_id="el-fallback", text=raw_claim, element_type="structural")],
        )

    def generate_hyde_for_element(self, element: ClaimElement) -> str:
        prompt = ChatPromptTemplate.from_template(HYDE_PROMPT)
        chain = prompt | self.hyde_llm
        try:
            response = chain.invoke({"element_text": element.text, "element_type": element.element_type})
            return response.content
        except Exception as e:
            logger.warning(f"HyDE API Error (possibly quota limits): {e}")
            return ""

    def process_claim(self, raw_claim: str) -> DecomposedClaim:
        logger.info("Starting claim decomposition...")
        # Step 1: Decompose
        decomposed = self.decompose_claim(raw_claim)

        logger.info(f"Decomposed into {len(decomposed.elements)} elements. Generating HyDE passages...")
        # Step 2: Generate HyDE passages
        # DECISION LOG: Element-level HyDE vs Whole-claim HyDE.
        # We choose Element-level HyDE here because it allows for finer-grained dense retrieval
        # on specific technical limitations, avoiding the "lost in the middle" problem of long
        # whole-claim passages. This costs more LLM calls but improves recall on paraphrased elements.
        for element in decomposed.elements:
            hyde_passage = self.generate_hyde_for_element(element)
            element.hyde_passage = hyde_passage

        logger.info("Query understanding complete.")
        return decomposed
