from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.app.main import app, limiter
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
    limiter.reset()
    mock_graph.invoke.return_value = {
        "decomposed_claim": {"raw_claim_text": "test", "elements": []},
        "bm25_results": [],
        "dense_results": [],
        "fused_results": [],
        "final_results": [],
    }

    headers = {"X-API-Key": "dev_key"}
    response = client.post(
        "/search", json={"raw_claim": "A valid claim test."}, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "disclaimer" in data
    assert data["disclaimer"] == DISCLAIMER_TEXT
