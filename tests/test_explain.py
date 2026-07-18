import pytest
from unittest.mock import patch, MagicMock
from backend.app.retrieval.explain import ExplanationGenerator
from backend.app.schemas import RetrievedDocument, DecomposedClaim, ClaimElement

def test_explanation_generation_success():
    generator = ExplanationGenerator()
    
    doc = RetrievedDocument(
        doc_id="123",
        title="Test Doc",
        snippet="The device comprises a processor.",
        retrieval_sources=["bm25"],
        raw_scores={},
        fused_score=1.0,
        matched_elements=["e1"]
    )
    
    claim = DecomposedClaim(
        raw_claim_text="A device comprising a processor.",
        elements=[ClaimElement(element_id="e1", text="a processor", element_type="structural")]
    )
    
    mock_msg = MagicMock()
    mock_msg.content = "This document matches 'a processor' exactly as seen in the snippet."
    
    with patch.object(generator.chain, 'invoke', return_value=mock_msg):
        result = generator.explain(doc, query_claim=claim)
        assert result == mock_msg.content
