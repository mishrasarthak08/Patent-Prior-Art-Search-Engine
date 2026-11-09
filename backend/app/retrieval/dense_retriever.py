import concurrent.futures
import datetime
import logging
from typing import Any

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Condition,
    DatetimeRange,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
)

from backend.app.config import settings
from backend.app.schemas import RetrievedDocument, SearchFilterParams
from backend.app.utils.key_manager import get_all_keys, get_current_api_key, rotate_api_key

logger = logging.getLogger(__name__)


class DenseRetriever:
    def __init__(self, collection_name: str = "patent_claims"):
        self.collection_name = collection_name
        self.client: QdrantClient | None = None
        self.embeddings: GoogleGenerativeAIEmbeddings | None = None
        self._init_client()
        self._init_embeddings()

    def _init_client(self):
        try:
            if settings.QDRANT_URL:
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY,
                    timeout=5,
                )
            else:
                self.client = QdrantClient(
                    host=settings.QDRANT_HOST,
                    port=settings.QDRANT_PORT,
                    api_key=settings.QDRANT_API_KEY,
                    timeout=5,
                )
        except Exception as e:
            logger.warning(f"Qdrant client initialization failed: {e}")
            self.client = None

    def _init_embeddings(self):
        current_key = get_current_api_key()
        if not current_key:
            return
        try:
            self.embeddings = GoogleGenerativeAIEmbeddings(
                google_api_key=current_key,  # type: ignore
                model="models/gemini-embedding-2",
                task_type="retrieval_query",
            )
        except Exception as e:
            logger.warning(f"Embeddings model initialization failed: {e}")
            self.embeddings = None

    def _build_qdrant_filter(self, filters: SearchFilterParams | None) -> Filter | None:
        if not filters:
            return None

        must_conditions: list[Condition] = []

        if filters.cpc_codes:
            must_conditions.append(FieldCondition(key="cpc_codes", match=MatchAny(any=filters.cpc_codes)))

        if filters.jurisdiction:
            must_conditions.append(FieldCondition(key="country", match=MatchValue(value=filters.jurisdiction.upper())))

        if filters.date_from or filters.date_to:
            range_kwargs: dict[str, Any] = {}
            if filters.date_from:
                range_kwargs["gte"] = datetime.date.fromisoformat(filters.date_from)
            if filters.date_to:
                range_kwargs["lte"] = datetime.date.fromisoformat(filters.date_to)
            must_conditions.append(FieldCondition(key="publication_date", range=DatetimeRange(**range_kwargs)))

        return Filter(must=must_conditions) if must_conditions else None

    def search(self, query: str, k: int = 15, filters: SearchFilterParams | None = None) -> list[RetrievedDocument]:
        if settings.CONFIDENTIAL_MODE:
            logger.info("Dense retrieval disabled in Confidential Mode to guarantee zero external egress.")
            return []

        if not self.client or not self.embeddings:
            logger.warning("Dense retriever unavailable (Qdrant client or embeddings not ready).")
            return []

        # Generate query vector with failover
        query_vector = None
        total_attempts = len(get_all_keys()) or 1

        for attempt in range(total_attempts):
            try:
                executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                future = executor.submit(self.embeddings.embed_query, query)
                try:
                    query_vector = future.result(timeout=10.0)
                    break
                except concurrent.futures.TimeoutError:
                    logger.warning("Dense query embedding timed out.")
                    return []
                finally:
                    executor.shutdown(wait=False)
            except Exception as e:
                err_str = str(e).lower()
                if "429" in err_str or "quota" in err_str or "resourceexhausted" in err_str:
                    if attempt < total_attempts - 1:
                        failed_key = ""
                        if self.embeddings and self.embeddings.google_api_key:
                            failed_key = (
                                self.embeddings.google_api_key.get_secret_value()
                                if hasattr(self.embeddings.google_api_key, "get_secret_value")
                                else str(self.embeddings.google_api_key)
                            )
                        rotate_api_key(failed_key)
                        self._init_embeddings()
                        continue
                logger.warning(f"Dense embedding failed: {e}")
                return []

        if not query_vector:
            return []

        # Execute vector search in Qdrant
        try:
            q_filter = self._build_qdrant_filter(filters)
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=q_filter,
                limit=k * 2 if (filters and filters.deduplicate_families) else k,
                with_payload=True,
            )
        except Exception as e:
            logger.warning(f"Qdrant vector search failed: {e}")
            return []

        results: list[RetrievedDocument] = []
        seen_families = set()

        for scored_point in search_results:
            payload = scored_point.payload or {}
            doc_id = payload.get("doc_id", str(scored_point.id))
            fam_id = payload.get("family_id", doc_id)

            if filters and filters.deduplicate_families:
                if fam_id in seen_families:
                    continue
                seen_families.add(fam_id)

            raw_text = payload.get("text", "")
            snippet = payload.get("snippet") or (raw_text[:350] + "..." if len(raw_text) > 350 else raw_text)

            results.append(
                RetrievedDocument(
                    doc_id=doc_id,
                    publication_number=payload.get("publication_number", doc_id),
                    title=payload.get("title", f"Patent Document {doc_id}"),
                    snippet=snippet or "Patent technical disclosure.",
                    abstract=payload.get("abstract"),
                    assignee=payload.get("assignee"),
                    publication_date=payload.get("publication_date"),
                    family_id=fam_id,
                    cpc_codes=payload.get("cpc_codes", []),
                    retrieval_sources=["dense"],
                    raw_scores={"dense": float(scored_point.score)},
                    fused_score=0.0,
                    matched_elements=[],
                )
            )

            if len(results) >= k:
                break

        return results


class HydeDenseRetriever(DenseRetriever):
    def search(self, query: str, k: int = 15, filters: SearchFilterParams | None = None) -> list[RetrievedDocument]:
        results = super().search(query, k, filters)
        for doc in results:
            doc.retrieval_sources = ["hyde"]
            doc.raw_scores = {"hyde": doc.raw_scores.get("dense", 0.0)}
        return results
