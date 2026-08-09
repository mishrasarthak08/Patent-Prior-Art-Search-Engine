import os
from typing import List

import cohere
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend.app.logger import get_logger
from backend.app.schemas import RetrievedDocument

logger = get_logger(__name__)


class CohereReranker:
    def __init__(self):
        # Graceful degradation if no API key
        api_key = os.getenv("COHERE_API_KEY")
        if not api_key or api_key == "your_cohere_api_key_here":
            logger.warning(
                "Valid COHERE_API_KEY not found. Reranker will be a pass-through."
            )
            self.client = None
        else:
            self.client = cohere.Client(api_key=api_key, timeout=5.0)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def _call_rerank_api(self, query: str, docs_text: List[str], top_n: int):
        return self.client.rerank(
            query=query, documents=docs_text, top_n=top_n, model="rerank-english-v3.0"
        )

    def rerank(
        self, query: str, candidates: List[RetrievedDocument], top_n: int
    ) -> List[RetrievedDocument]:
        if not self.client or not candidates:
            return candidates[:top_n]

        try:
            docs_text = [doc.snippet for doc in candidates]
            response = self._call_rerank_api(query, docs_text, top_n)

            # Reorder candidates based on response
            reranked_docs = []
            for result in response.results:
                idx = result.index
                doc = candidates[idx]
                doc.rerank_score = result.relevance_score
                reranked_docs.append(doc)

            return reranked_docs
        except Exception as e:
            logger.warning(
                f"Reranker failed after retries with error: {e}. Falling back to RRF ordering."
            )
            return candidates[:top_n]
