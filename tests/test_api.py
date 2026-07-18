import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.app.main import app
from backend.app.schemas import DISCLAIMER_TEXT

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("backend.app.main.requests.get")
def test_ready_endpoint_success(mock_get):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_get.return_value = mock_resp
    
    response = client.get("/ready")
    assert response.status_code == 200

@patch("backend.app.main.requests.get")
def test_ready_endpoint_failure(mock_get):
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_get.return_value = mock_resp
    
    response = client.get("/ready")
    assert response.status_code == 503

@patch("backend.app.main.retrieval_graph")
def test_search_disclaimer_presence(mock_graph):
    mock_graph.invoke.return_value = {
        "decomposed_claim": {"raw_claim_text": "test", "elements": []},
        "bm25_results": [],
        "dense_results": [],
        "fused_results": [],
        "final_results": []
    }
    
    response = client.post("/search", json={"raw_claim": "A valid claim test."})
    assert response.status_code == 200
    data = response.json()
    assert "disclaimer" in data
    assert data["disclaimer"] == DISCLAIMER_TEXT
