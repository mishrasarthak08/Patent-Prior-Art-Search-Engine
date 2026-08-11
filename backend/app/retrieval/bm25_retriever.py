import os
import pickle

from backend.app.schemas import RetrievedDocument


def tokenize_patent_text(text: str) -> list[str]:
    # Reuse the tokenization from ingestion
    if not text:
        return []
    text = text.lower()
    tokens = text.split()
    clean_tokens = []
    for token in tokens:
        token = token.strip(".,;:!?()[]{}'\"")
        if token:
            clean_tokens.append(token)
    return clean_tokens


class BM25Retriever:
    def __init__(self, index_path: str = "data/corpus/bm25_index.pkl", collection_name: str = "patent_claims"):
        self.index_path = index_path
        self.collection_name = collection_name
        self.bm25_model = None
        self.doc_ids = []
        if os.path.exists(self.index_path):
            with open(self.index_path, "rb") as f:
                data = pickle.load(f)
                self.bm25_model = data["bm25_model"]
                self.doc_ids = data["doc_ids"]

        from qdrant_client import QdrantClient

        qdrant_host = os.environ.get("QDRANT_HOST", "localhost")
        qdrant_port = int(os.environ.get("QDRANT_PORT", "6333"))
        qdrant_url = os.environ.get("QDRANT_URL")
        qdrant_api_key = os.environ.get("QDRANT_API_KEY")

        if qdrant_url:
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=60)
        else:
            self.client = QdrantClient(host=qdrant_host, port=qdrant_port, api_key=qdrant_api_key, timeout=60)

    def search(self, query: str, k: int, filters: dict | None = None) -> list[RetrievedDocument]:
        if not self.bm25_model:
            return []

        tokenized_query = tokenize_patent_text(query)
        scores = self.bm25_model.get_scores(tokenized_query)

        # Get top-k indices
        top_k_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]

        # Extract top doc IDs and their scores
        top_docs_info = []
        for idx in top_k_indices:
            score = scores[idx]
            if score <= 0:
                continue
            top_docs_info.append({"doc_id": self.doc_ids[idx], "score": score})

        if not top_docs_info:
            return []

        # Hydrate with Qdrant payloads
        doc_ids_to_fetch = [info["doc_id"] for info in top_docs_info]
        try:
            from qdrant_client.http.models import FieldCondition, Filter, MatchAny

            scroll_res, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=Filter(must=[FieldCondition(key="doc_id", match=MatchAny(any=doc_ids_to_fetch))]),
                limit=100,
            )
            payload_map = {point.payload.get("doc_id"): point.payload for point in scroll_res}  # type: ignore
        except Exception as e:
            import logging

            logging.error(f"Failed to fetch payloads in BM25: {e}")
            payload_map = {}

        results = []
        for info in top_docs_info:
            doc_id = info["doc_id"]
            payload = payload_map.get(doc_id, {})
            text = payload.get("text", "")  # type: ignore

            doc = RetrievedDocument(
                doc_id=str(doc_id),
                title=payload.get("title") or f"Patent Document {doc_id}",  # type: ignore
                snippet=payload.get("snippet") or (text[:250] + "..." if text else "Snippet not found."),  # type: ignore
                retrieval_sources=["bm25"],
                raw_scores={"bm25": float(info["score"])},
                fused_score=0.0,
                matched_elements=[],
            )
            results.append(doc)

        return results
