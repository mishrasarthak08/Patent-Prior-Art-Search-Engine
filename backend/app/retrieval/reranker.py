import logging
import os
import re

import cohere
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from backend.app.config import settings
from backend.app.db.models import PatentDocument
from backend.app.db.session import SessionLocal
from backend.app.schemas import RetrievedDocument

logger = logging.getLogger(__name__)


class CohereReranker:
    def __init__(self):
        api_key = settings.COHERE_API_KEY or os.getenv("COHERE_API_KEY")
        if not api_key or api_key == "your_cohere_api_key_here":
            logger.info("COHERE_API_KEY not configured. Local cross-scoring fallback will be utilized.")
            self.client = None
        else:
            try:
                self.client = cohere.Client(api_key=api_key, timeout=5.0)
            except Exception as e:
                logger.warning(f"Failed to initialize Cohere client: {e}")
                self.client = None

    def _get_expanded_document_text(self, doc: RetrievedDocument) -> str:
        """
        Retrieves full technical disclosure text (abstract + primary claims + description)
        rather than a tiny 250-char snippet, preventing critical technical information loss.
        """
        db = SessionLocal()
        try:
            patent = db.query(PatentDocument).filter(PatentDocument.id == doc.doc_id).first()
            if patent:
                parts = []
                if patent.title:
                    parts.append(f"Title: {patent.title}")
                if patent.abstract:
                    parts.append(f"Abstract: {patent.abstract}")
                if patent.claims_list:
                    parts.append(f"Claim 1: {patent.claims_list[0]}")
                if patent.description_text:
                    parts.append(f"Description: {patent.description_text[:600]}")
                return "\n".join(parts)
        except Exception:
            pass
        finally:
            db.close()

        # Fallback to doc properties
        return f"{doc.title}. {doc.abstract or ''} {doc.snippet}"

    @retry(
        stop=stop_after_attempt(1),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def _call_rerank_api(self, query: str, docs_text: list[str], top_n: int):
        if not self.client:
            raise ValueError("Cohere client is not initialized")
        return self.client.rerank(
            query=query,
            documents=docs_text,
            top_n=top_n,
            model="rerank-english-v3.0",
        )

    def _fallback_cross_scorer(
        self, query: str, candidates: list[RetrievedDocument], top_n: int
    ) -> list[RetrievedDocument]:
        """
        High-fidelity heuristic cross-encoder fallback when external Cohere API is unavailable.
        Scores candidate passage window alignment against query technical limitations.
        """
        query_words = set(re.findall(r"\b[a-z0-9\-]{4,}\b", query.lower()))
        scored_candidates = []

        for rank, doc in enumerate(candidates):
            full_text = self._get_expanded_document_text(doc).lower()
            overlap_count = sum(1 for w in query_words if w in full_text)
            overlap_ratio = overlap_count / len(query_words) if query_words else 0.0

            # Blend lexical coverage (60%) with original fusion rank (40%)
            heuristic_score = round(0.6 * overlap_ratio + 0.4 * doc.fused_score, 4)
            doc.rerank_score = heuristic_score
            scored_candidates.append(doc)

        scored_candidates.sort(key=lambda d: d.rerank_score or 0.0, reverse=True)
        return scored_candidates[:top_n]

    def rerank(self, query: str, candidates: list[RetrievedDocument], top_n: int = 10) -> list[RetrievedDocument]:
        if not candidates:
            return []

        if settings.CONFIDENTIAL_MODE or not self.client:
            return self._fallback_cross_scorer(query, candidates, top_n)

        try:
            # Build comprehensive text windows for each candidate
            docs_text = [self._get_expanded_document_text(doc) for doc in candidates]
            response = self._call_rerank_api(query, docs_text, top_n)

            reranked_docs = []
            for result in response.results:
                idx = result.index
                doc = candidates[idx]
                doc.rerank_score = round(result.relevance_score, 4)
                reranked_docs.append(doc)

            return reranked_docs
        except Exception as e:
            logger.warning(f"Cohere rerank failed: {e}. Falling back to RRF rank ordering.")
            for d in candidates:
                d.rerank_score = None
            return candidates[:top_n]
