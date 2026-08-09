import os

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from qdrant_client import QdrantClient

from backend.app.schemas import RetrievedDocument


class DenseRetriever:
    def __init__(self, collection_name: str = "patent_claims"):
        self.collection_name = collection_name
        qdrant_host = os.environ.get("QDRANT_HOST", "localhost")
        qdrant_port = int(os.environ.get("QDRANT_PORT", "6333"))
        qdrant_url = os.environ.get("QDRANT_URL")
        qdrant_api_key = os.environ.get("QDRANT_API_KEY")

        if qdrant_url:
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=5)
        else:
            self.client = QdrantClient(host=qdrant_host, port=qdrant_port, api_key=qdrant_api_key, timeout=5)
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2", task_type="retrieval_query")  # type: ignore

    def search(self, query: str, k: int, filters: dict | None = None) -> list[RetrievedDocument]:
        import logging

        logger = logging.getLogger(__name__)

        # Embed query
        try:
            query_vector = self.embeddings.embed_query(query)
        except Exception as e:
            logger.error(
                "Embedding generation failed (e.g., quota or invalid key): %s. Falling back to empty dense results.",
                e,
            )
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
                title=f"Unknown Title (Dense: {payload.get('type')})",
                snippet=text[:200] + "...",
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
