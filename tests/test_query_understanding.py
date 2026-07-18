import pytest
from unittest.mock import patch
from pydantic import ValidationError
from langchain_core.messages import AIMessage
from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline
from backend.app.schemas import DecomposedClaim, ClaimElement

@pytest.fixture
def pipeline():
    return QueryUnderstandingPipeline()

def test_claim_decomposition_success(pipeline):
    # We mock the LLM call to return a valid JSON string matching the schema
    valid_json = '''
    {
        "raw_claim_text": "A device comprising a processor, a memory, and a battery.",
        "claim_number": "1",
        "elements": [
            {"element_id": "e1", "text": "a processor", "element_type": "structural"},
            {"element_id": "e2", "text": "a memory", "element_type": "structural"},
            {"element_id": "e3", "text": "a battery", "element_type": "structural"}
        ]
    }
    '''
    mock_msg = AIMessage(content=valid_json)

    with patch('backend.app.retrieval.query_understanding.ChatOpenAI.invoke', return_value=mock_msg):
        result = pipeline.decompose_claim("A device comprising a processor, a memory, and a battery.")
        assert isinstance(result, DecomposedClaim)
        assert len(result.elements) == 3
        assert result.elements[0].element_type == "structural"

def test_claim_decomposition_retry_on_malformed(pipeline):
    # Mock first response as malformed JSON, second response as valid JSON
    malformed_msg = AIMessage(content='{"missing_fields": true}')
    
    valid_json = '''
    {
        "raw_claim_text": "test",
        "elements": [
            {"element_id": "e1", "text": "test elem", "element_type": "structural"}
        ]
    }
    '''
    valid_msg = AIMessage(content=valid_json)

    with patch('backend.app.retrieval.query_understanding.ChatOpenAI.invoke', side_effect=[malformed_msg, valid_msg]) as mock_invoke:
        result = pipeline.decompose_claim("test claim", max_retries=1)
        assert mock_invoke.call_count == 2
        assert len(result.elements) == 1

from langchain_core.exceptions import OutputParserException

def test_claim_decomposition_fails_safely_after_max_retries(pipeline):
    malformed_msg = AIMessage(content='{"missing_fields": true}')
    
    with patch('backend.app.retrieval.query_understanding.ChatOpenAI.invoke', return_value=malformed_msg) as mock_invoke:
        with pytest.raises(OutputParserException):
            pipeline.decompose_claim("test claim", max_retries=1)
        assert mock_invoke.call_count == 2
