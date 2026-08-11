import os

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from qdrant_client import QdrantClient

from backend.app.schemas import RetrievedDocument
from backend.app.utils.key_manager import get_all_keys, get_current_api_key, rotate_api_key  # type: ignore


class DenseRetriever:
    def __init__(self, collection_name: str = "patent_claims"):
        self.collection_name = collection_name
        qdrant_host = os.environ.get("QDRANT_HOST", "localhost")
        qdrant_port = int(os.environ.get("QDRANT_PORT", "6333"))
        qdrant_url = os.environ.get("QDRANT_URL")
        qdrant_api_key = os.environ.get("QDRANT_API_KEY")

        if qdrant_url:
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=60)
        else:
            self.client = QdrantClient(host=qdrant_host, port=qdrant_port, api_key=qdrant_api_key, timeout=60)
        self.embeddings = GoogleGenerativeAIEmbeddings(
            google_api_key=get_current_api_key(), model="models/gemini-embedding-2", task_type="retrieval_query"
        )  # type: ignore

    def search(self, query: str, k: int, filters: dict | None = None) -> list[RetrievedDocument]:
        import logging

        logger = logging.getLogger(__name__)

        # Embed query
        import concurrent.futures

        query_vector = None
        total_attempts = len(get_all_keys()) or 1
        for attempt in range(total_attempts):
            try:
                executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                future = executor.submit(self.embeddings.embed_query, query)
                try:
                    query_vector = future.result(timeout=30.0)
                    break
                except concurrent.futures.TimeoutError:
                    logger.error("Embedding generation timed out after 30.0 seconds.")
                    return []
                finally:
                    executor.shutdown(wait=False)
            except Exception as e:
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str or "resourceexhausted" in error_str:
                    if attempt < total_attempts - 1:
                        logger.warning("Quota hit, rotating key for embeddings...")
                        failed_key = (
                            self.embeddings.google_api_key.get_secret_value()
                            if hasattr(self.embeddings.google_api_key, "get_secret_value")
                            else self.embeddings.google_api_key
                        )  # type: ignore
                        rotate_api_key(failed_key)  # type: ignore
                        self.embeddings = GoogleGenerativeAIEmbeddings(
                            google_api_key=get_current_api_key(),
                            model="models/gemini-embedding-2",
                            task_type="retrieval_query",
                        )  # type: ignore
                        continue
                logger.error(
                    "Embedding generation failed: %s. Falling back to empty dense results.",
                    e,
                )
                return []

        if query_vector is None:
            return []

        # We can add Qdrant filters based on CPC/Date here if passed
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=k,
            with_payload=True,
        )

        results = []
        for scored_point in search_result:
            payload = scored_point.payload or {}
            doc_id = payload.get("doc_id", "unknown")
            text = payload.get("text", "")

            doc = RetrievedDocument(
                doc_id=doc_id,
                title=payload.get("title") or f"Patent Document {doc_id}",
                snippet=payload.get("snippet") or text[:250] + "...",
                retrieval_sources=["dense"],
                raw_scores={"dense": float(scored_point.score)},
                fused_score=0.0,
                matched_elements=[],
            )
            results.append(doc)

        return results


class HydeDenseRetriever(DenseRetriever):
    def search(self, query: str, k: int, filters: dict | None = None) -> list[RetrievedDocument]:
        results = super().search(query, k, filters)
        for doc in results:
            doc.retrieval_sources = ["hyde"]
            doc.raw_scores = {"hyde": doc.raw_scores.get("dense", 0.0)}
        return results
