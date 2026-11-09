import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)
AUTH_HEADERS = {"X-API-Key": "dev_key"}


def test_corpus_coverage_endpoint():
    """Verify Corpus Coverage Explorer API returns comprehensive multi-jurisdiction statistics."""
    resp = client.get("/api/v1/corpus/coverage", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_documents"] >= 50
    assert data["total_claims"] >= 100
    assert len(data["jurisdiction_breakdown"]) >= 3
    countries = {j["country"] for j in data["jurisdiction_breakdown"]}
    assert "US" in countries
    assert "EP" in countries
    assert "WO" in countries
    assert len(data["sector_breakdown"]) >= 5
    assert data["citation_graph"]["edges_count"] > 0
    assert data["indexing_health"]["sqlite_synchronized"] is True


def test_patent_graph_endpoint():
    """Verify Patent Citation & Family Network Graph API."""
    resp = client.get("/api/v1/patents/US10892482B2/graph", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert data["root_doc_id"] == "US10892482B2"
    assert len(data["nodes"]) >= 2
    assert len(data["edges"]) >= 1
    # Check relationships
    rel_types = {e["relationship"] for e in data["edges"]}
    assert "SAME_FAMILY" in rel_types or "CITES" in rel_types or "CITED_BY" in rel_types


def test_iterative_search_with_gap_analysis():
    """Verify Multi-Strategy Discovery and Limitation Gap Analysis."""
    claim = (
        "A lithium-ion secondary battery comprising: a cathode comprising lithium nickel cobalt manganese oxide; "
        "an anode comprising silicon-graphite composite nanoparticles; and an electrolyte with fluoroethylene carbonate."
    )
    payload = {"raw_claim": claim, "top_k": 5}
    resp = client.post("/api/v1/search/iterative", json=payload, headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) > 0
    assert len(data["strategy_provenance"]) >= 2
    assert "gap_summary" in data
    assert data["gap_summary"]["total_limitations"] >= 2
    assert len(data["limitation_gaps"]) >= 2


def test_evidence_ledger_and_review():
    """Verify Evidence Integrity Ledger with section/paragraph coordinates and human audit review."""
    # First get ledger entries
    resp = client.get("/api/v1/evidence-ledger?limit=10", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)

    # Trigger a search to create evidence mappings
    claim = "A battery comprising an anode with nanostructured silicon particles."
    search_resp = client.post("/api/v1/search", json={"raw_claim": claim}, headers=AUTH_HEADERS)
    assert search_resp.status_code == 200

    resp2 = client.get("/api/v1/evidence-ledger?limit=10", headers=AUTH_HEADERS)
    assert resp2.status_code == 200
    items2 = resp2.json()
    if items2:
        target_id = items2[0]["id"]
        review_payload = {
            "decision": "HUMAN_VERIFIED",
            "notes": "Verified against specification paragraph [0022] by IP counsel."
        }
        rev_resp = client.post(f"/api/v1/evidence-ledger/{target_id}/review", json=review_payload, headers=AUTH_HEADERS)
        assert rev_resp.status_code == 200
        rev_data = rev_resp.json()
        assert rev_data["reviewer_decision"] == "HUMAN_VERIFIED"
        assert rev_data["attorney_review_status"] == "ACCEPTED"


def test_multi_claim_mapping_matrix():
    """Verify Multi-Document Claim Mapping Matrix (comparing 1 claim against multiple patents)."""
    claim = "A battery comprising a cathode of NMC and an anode of silicon nanoparticles in carbon."
    payload = {
        "raw_claim": claim,
        "doc_ids": ["US10892482B2", "US10454101B2", "EP3890123A1"]
    }
    resp = client.post("/api/v1/patents/multi-claim-map", json=payload, headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["columns"]) == 3
    assert len(data["elements"]) >= 1
    assert len(data["matrix"]) == len(data["elements"])
    assert len(data["matrix"][0]) == 3  # 3 columns


def test_scientific_eval_benchmarks():
    """Verify Evaluation Laboratory benchmark metrics."""
    resp = client.get("/api/v1/eval/benchmarks", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "ablation_results" in data
    ablation = data["ablation_results"]
    assert "bm25_only" in ablation
    assert "iterative_search" in ablation
    # MRR and Recall@5 should be high on gold patents
    assert ablation["bm25_only"]["MRR"] > 0.8
    assert ablation["iterative_search"]["R@5"] > 0.8
