from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)
AUTH_HEADERS = {"X-API-Key": "dev_key"}


def test_project_lifecycle():
    # 1. Create a new research project
    project_payload = {
        "name": "Electrolyte Optimization Matter",
        "matter_number": "MAT-2026-099",
        "description": "Prior art investigation for fluoroethylene carbonate additives",
        "client_name": "NextGen Battery Corp",
    }
    create_res = client.post("/api/v1/projects", json=project_payload, headers=AUTH_HEADERS)
    assert create_res.status_code == 200
    data = create_res.json()
    assert "id" in data
    assert data["name"] == project_payload["name"]
    project_id = data["id"]

    # 2. List projects and verify it appears
    list_res = client.get("/api/v1/projects", headers=AUTH_HEADERS)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == project_id for p in projects)

    # 3. Retrieve project details
    detail_res = client.get(f"/api/v1/projects/{project_id}", headers=AUTH_HEADERS)
    assert detail_res.status_code == 200
    assert detail_res.json()["matter_number"] == "MAT-2026-099"


def test_patent_document_inspector():
    # Fetch existing seeded patent
    res = client.get("/api/v1/documents/US10892482B2", headers=AUTH_HEADERS)
    assert res.status_code == 200
    doc = res.json()
    assert doc["id"] == "US10892482B2"
    assert "Lithium-ion secondary battery" in doc["title"]
    assert len(doc["claims_list"]) >= 1
    assert "fluoroethylene carbonate" in doc["abstract"].lower()
    assert "H01M4/386" in doc["cpc_codes"]


def test_search_with_filters_and_evidence():
    claim = (
        "A lithium-ion secondary battery comprising: a cathode comprising lithium nickel cobalt manganese oxide; "
        "an anode comprising silicon-graphite composite nanoparticles; and an electrolyte comprising fluoroethylene carbonate."
    )
    search_payload = {
        "raw_claim": claim,
        "project_id": "default-workspace",
        "filters": {
            "cpc_codes": ["H01M"],
            "deduplicate_families": True,
        },
    }

    res = client.post("/api/v1/search", json=search_payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert "search_id" in data
    assert data["search_id"] is not None
    search_id = data["search_id"]

    assert len(data["results"]) > 0
    top_doc = data["results"][0]
    assert "claim_chart" in top_doc
    assert len(top_doc["claim_chart"]) > 0

    # Verify that at least one limitation was verified against actual document text
    verified_elements = [c for c in top_doc["claim_chart"] if c["verified"]]
    assert len(verified_elements) > 0
    assert verified_elements[0]["exact_quote"] is not None

    # Test Search History retrieval
    history_res = client.get(f"/api/v1/searches/{search_id}", headers=AUTH_HEADERS)
    assert history_res.status_code == 200
    hist_data = history_res.json()
    assert hist_data["id"] == search_id
    assert len(hist_data["results"]) > 0

    # Test Evidence Matrix retrieval
    ev_res = client.get(f"/api/v1/searches/{search_id}/evidence", headers=AUTH_HEADERS)
    assert ev_res.status_code == 200
    assert len(ev_res.json()) > 0

    # Test Annotation creation
    annot_payload = {
        "doc_id": top_doc["doc_id"],
        "review_status": "HIGHLY_RELEVANT",
        "notes": "Direct disclosure of NMC cathode + FEC additive in Description [0035]",
    }
    annot_res = client.post(f"/api/v1/searches/{search_id}/annotate", json=annot_payload, headers=AUTH_HEADERS)
    assert annot_res.status_code == 200
    assert annot_res.json()["status"] == "saved"

    # Test Export Prior-Art Dossier
    export_res = client.get(f"/api/v1/searches/{search_id}/export", headers=AUTH_HEADERS)
    assert export_res.status_code == 200
    report_data = export_res.json()
    assert report_data["format"] == "markdown"
    assert "# Prior-Art Search & Evidence Dossier" in report_data["report"]
    assert "Evidence Claim Chart" in report_data["report"]
    assert "Statutory Legal Disclaimer" in report_data["report"]
