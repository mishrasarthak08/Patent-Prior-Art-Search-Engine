from unittest.mock import MagicMock
from backend.app.schemas import RetrievedDocument
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.reranker import CohereReranker


def test_fusion_recovers_missing_documents():
    # Setup mock doc from BM25 (Exact Match) - Dense misses this entirely
    doc_bm25 = RetrievedDocument(
        doc_id="doc_exact",
        title="Exact Match",
        snippet="...",
        retrieval_sources=["bm25"],
        raw_scores={"bm25": 10.0},
        fused_score=0.0,
        matched_elements=[],
    )

    # Setup mock doc from Dense (Semantic Paraphrase) - BM25 misses this entirely
    doc_dense = RetrievedDocument(
        doc_id="doc_semantic",
        title="Semantic Paraphrase",
        snippet="...",
        retrieval_sources=["dense"],
        raw_scores={"dense": 0.9},
        fused_score=0.0,
        matched_elements=[],
    )

    bm25_list = [doc_bm25]
    dense_list = [doc_dense]

    # The forcing function: Fusion must combine both lists and surface BOTH missing docs
    fused_docs = reciprocal_rank_fusion([bm25_list, dense_list])

    assert len(fused_docs) == 2
    fused_ids = [d.doc_id for d in fused_docs]
    assert "doc_exact" in fused_ids
    assert "doc_semantic" in fused_ids


def test_reranker_fallback_degrades_gracefully():
    # Setup mock doc
    doc = RetrievedDocument(
        doc_id="doc_1",
        title="Test",
        snippet="test snippet",
        retrieval_sources=["bm25"],
        raw_scores={},
        fused_score=1.0,
        matched_elements=[],
    )

    # Mock Cohere throwing an error (e.g. timeout or auth failure)
    reranker = CohereReranker()
    reranker.client = MagicMock()
    reranker.client.rerank.side_effect = Exception("API Timeout")

    # Should not crash, should return original list (degrade to RRF)
    result = reranker.rerank("query", [doc], top_n=10)
    assert len(result) == 1
    assert result[0].doc_id == "doc_1"
    assert result[0].rerank_score is None
