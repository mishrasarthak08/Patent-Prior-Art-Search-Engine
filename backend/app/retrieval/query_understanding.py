import concurrent.futures
import logging

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import ValidationError

from backend.app.schemas import ClaimElement, DecomposedClaim
from backend.app.utils.key_manager import get_all_keys, get_current_api_key, rotate_api_key

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
        self.llm = ChatGoogleGenerativeAI(
            google_api_key=get_current_api_key(),  # type: ignore
            model="gemini-flash-latest",
            temperature=0,
            request_timeout=15.0,
            max_retries=0,
        )  # type: ignore
        self.hyde_llm = ChatGoogleGenerativeAI(
            google_api_key=get_current_api_key(),  # type: ignore
            model="gemini-flash-latest",
            temperature=0.7,
            request_timeout=10.0,
            max_retries=0,
        )  # type: ignore

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

    def decompose_claim(self, raw_claim: str, max_retries: int = 0) -> DecomposedClaim:
        """Decomposes a raw claim with retry logic for schema validation (fails safely)."""
        chain = self.decomposition_prompt | self.llm | self.decomposition_parser

        total_attempts = max(max_retries + 1, len(get_all_keys()) or 1)

        for attempt in range(total_attempts):
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            future = executor.submit(
                chain.invoke,
                {
                    "raw_claim": raw_claim,
                    "format_instructions": self.decomposition_parser.get_format_instructions(),
                },
            )
            try:
                result = future.result(timeout=30.0)
                return result
            except concurrent.futures.TimeoutError:
                logger.warning(f"Decomposition timeout on attempt {attempt}")
                if attempt == total_attempts - 1:
                    logger.error("Max retries reached for claim decomposition.")
                    return DecomposedClaim(
                        raw_claim_text=raw_claim,
                        elements=[ClaimElement(element_id="el-fallback", text=raw_claim, element_type="structural")],
                    )
            except ValidationError as e:
                logger.warning(f"Validation error on attempt {attempt}: {e}")
                if attempt == total_attempts - 1:
                    logger.error("Max retries reached for claim decomposition.")
                    return DecomposedClaim(
                        raw_claim_text=raw_claim,
                        elements=[ClaimElement(element_id="el-fallback", text=raw_claim, element_type="structural")],
                    )
            except Exception as e:
                logger.warning(f"API Error during decomposition: {e}")
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str or "resourceexhausted" in error_str:
                    if attempt < total_attempts - 1:
                        logger.warning("Quota hit, rotating key for decomposition...")
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
                            request_timeout=15.0,
                            max_retries=0,
                        )  # type: ignore
                        chain = self.decomposition_prompt | self.llm | self.decomposition_parser
                        continue
                if attempt == total_attempts - 1:
                    logger.error("Fallback triggered due to API limits or max retries.")
                    return DecomposedClaim(
                        raw_claim_text=raw_claim,
                        elements=[ClaimElement(element_id="el-fallback", text=raw_claim, element_type="structural")],
                    )
            finally:
                executor.shutdown(wait=False)

        return DecomposedClaim(
            raw_claim_text=raw_claim,
            elements=[ClaimElement(element_id="el-fallback", text=raw_claim, element_type="structural")],
        )

    def generate_hyde_for_element(self, element: ClaimElement) -> str:
        prompt = ChatPromptTemplate.from_template(HYDE_PROMPT)
        chain = prompt | self.hyde_llm
        total_attempts = len(get_all_keys()) or 1
        for attempt in range(total_attempts):
            try:
                response = chain.invoke({"element_text": element.text, "element_type": element.element_type})
                return response.content
            except Exception as e:
                logger.warning(f"HyDE API Error: {e}")
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str or "resourceexhausted" in error_str:
                    if attempt < total_attempts - 1:
                        logger.warning("Quota hit, rotating key for HyDE generation...")
                        failed_key = (
                            self.hyde_llm.google_api_key.get_secret_value()
                            if hasattr(self.hyde_llm.google_api_key, "get_secret_value")
                            else self.hyde_llm.google_api_key
                        )
                        rotate_api_key(failed_key)
                        self.hyde_llm = ChatGoogleGenerativeAI(
                            google_api_key=get_current_api_key(),  # type: ignore
                            model="gemini-flash-latest",
                            temperature=0.7,
                            request_timeout=10.0,
                            max_retries=0,
                        )  # type: ignore
                        chain = prompt | self.hyde_llm
                        continue
                return ""
        return ""

    def process_claim(self, raw_claim: str) -> DecomposedClaim:
        logger.info("Starting claim decomposition...")
        # Step 1: Decompose
        decomposed = self.decompose_claim(raw_claim)

        logger.info(f"Decomposed into {len(decomposed.elements)} elements. Generating HyDE passages...")
        # Step 2: Generate HyDE passages

        # Fast fail: If decomposition fell back, don't waste time trying HyDE
        if len(decomposed.elements) == 1 and decomposed.elements[0].element_id == "el-fallback":
            logger.info("Skipping HyDE generation for fallback element.")
            return decomposed

        def generate_hyde(element):
            hyde_passage = self.generate_hyde_for_element(element)
            element.hyde_passage = hyde_passage

        executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
        futures = [executor.submit(generate_hyde, element) for element in decomposed.elements]
        try:
            concurrent.futures.wait(futures, timeout=30.0)
        finally:
            executor.shutdown(wait=False)

        logger.info("Query understanding complete.")
        return decomposed
