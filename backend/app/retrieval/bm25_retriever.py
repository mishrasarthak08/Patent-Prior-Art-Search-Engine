import os
import pickle
from typing import Dict, List, Optional

from backend.app.schemas import RetrievedDocument


def tokenize_patent_text(text: str) -> List[str]:
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
    def __init__(self, index_path: str = "data/corpus/bm25_index.pkl"):
        self.index_path = index_path
        self.bm25_model = None
        self.doc_ids = []
        if os.path.exists(self.index_path):
            with open(self.index_path, "rb") as f:
                data = pickle.load(f)
                self.bm25_model = data["bm25_model"]
                self.doc_ids = data["doc_ids"]

    def search(
        self, query: str, k: int, filters: Optional[Dict] = None
    ) -> List[RetrievedDocument]:
        if not self.bm25_model:
            return []

        tokenized_query = tokenize_patent_text(query)
        scores = self.bm25_model.get_scores(tokenized_query)

        # Get top-k indices
        top_k_indices = sorted(
            range(len(scores)), key=lambda i: scores[i], reverse=True
        )[:k]

        results = []
        for idx in top_k_indices:
            score = scores[idx]
            if score <= 0:
                continue
            doc_id = self.doc_ids[idx]

            doc = RetrievedDocument(
                doc_id=doc_id,
                title="Unknown Title (BM25)",  # Ideally load from metadata
                snippet="Snippet from BM25",
                retrieval_sources=["bm25"],
                raw_scores={"bm25": float(score)},
                fused_score=0.0,
                matched_elements=[],
            )
            results.append(doc)

        return results
