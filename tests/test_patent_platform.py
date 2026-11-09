import uuid

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_auth_workflow_and_jwt():
    # 1. Register a new user with unique email
    unique_email = f"partner.{uuid.uuid4().hex[:8]}@patentsearchengine.com"
    reg_payload = {
        "email": unique_email,
        "full_name": "Alexander Hamilton, Esq.",
        "password": "securepassword2026",
        "organization_name": "Hamilton Intellectual Property LLP",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    data = reg_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == reg_payload["email"]
    token = data["access_token"]
    jwt_headers = {"Authorization": f"Bearer {token}"}

    # 2. Check /auth/me with JWT token
    me_res = client.get("/api/v1/auth/me", headers=jwt_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == reg_payload["email"]

    # 3. Login with credentials
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": reg_payload["email"], "password": reg_payload["password"]},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_workspace_and_organization_management():
    # Login as seed admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@patentsearchengine.com", "password": "patent2026"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List workspaces
    ws_res = client.get("/api/v1/workspaces", headers=headers)
    assert ws_res.status_code == 200
    workspaces = ws_res.json()
    assert len(workspaces) >= 1

    # Create new workspace
    new_ws_payload = {
        "name": "Medical Devices & Nanotech",
        "description": "Lipid nanoparticles and targeted mRNA delivery therapeutics.",
        "is_default": False,
    }
    create_ws = client.post("/api/v1/workspaces", json=new_ws_payload, headers=headers)
    assert create_ws.status_code == 200
    assert create_ws.json()["name"] == new_ws_payload["name"]

    # Check Organization details
    org_res = client.get("/api/v1/organization", headers=headers)
    assert org_res.status_code == 200
    assert org_res.json()["plan"] in ["STARTER", "PROFESSIONAL", "ENTERPRISE"]

    # Check Usage metrics
    usage_res = client.get("/api/v1/organization/usage", headers=headers)
    assert usage_res.status_code == 200
    assert "searches_count" in usage_res.json()
    assert "max_searches" in usage_res.json()


def test_matters_crud_and_status_filtering():
    headers = {"X-API-Key": "dev_key"}

    # Create Matter
    matter_payload = {
        "name": "Solid-State Cathode Resistance Matter",
        "matter_number": "MAT-2026-CAT01",
        "client_name": "Apex Energy Storage Inc.",
        "jurisdiction": "US",
        "technical_domain": "Energy",
        "notes": "Critical 102 anticipation review required.",
    }
    create_res = client.post("/api/v1/matters", json=matter_payload, headers=headers)
    assert create_res.status_code == 200
    matter_id = create_res.json()["id"]

    # Filter Matters by domain
    list_res = client.get("/api/v1/matters?domain=Energy", headers=headers)
    assert list_res.status_code == 200
    assert any(m["id"] == matter_id for m in list_res.json())

    # Update Matter status to UNDER_REVIEW
    update_res = client.patch(
        f"/api/v1/matters/{matter_id}",
        json={"status": "UNDER_REVIEW", "notes": "Partner review initiated."},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["matter_status"] == "UNDER_REVIEW"


def test_patent_explorer_and_comparison():
    headers = {"X-API-Key": "dev_key"}

    # Standalone Explorer search
    explore_res = client.get("/api/v1/patents/explore?q=battery", headers=headers)
    assert explore_res.status_code == 200
    patents = explore_res.json()
    assert len(patents) >= 1
    assert any("battery" in p["title"].lower() for p in patents)

    # Patent Comparison tool
    compare_payload = {"doc_ids": ["US10892482B2", "US10454101B2"]}
    comp_res = client.post("/api/v1/patents/compare", json=compare_payload, headers=headers)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["patents"]) == 2
    assert "differentiating_factors" in comp_data


def test_saved_documents_repository():
    headers = {"X-API-Key": "dev_key"}

    # Save document
    save_payload = {
        "doc_id": "US10892482B2",
        "tags": ["Prior-Art-Key", "Silicon-Anode"],
        "notes": "Primary reference for limitation el-1.",
    }
    save_res = client.post("/api/v1/saved-documents", json=save_payload, headers=headers)
    assert save_res.status_code == 200
    saved_id = save_res.json()["id"]

    # List saved documents
    list_res = client.get("/api/v1/saved-documents", headers=headers)
    assert list_res.status_code == 200
    assert any(sd["id"] == saved_id for sd in list_res.json())

    # Delete saved document
    del_res = client.delete(f"/api/v1/saved-documents/{saved_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"
