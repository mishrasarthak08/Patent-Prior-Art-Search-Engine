"""
Comprehensive Multi-Tenant Isolation & SaaS Security Test Suite
Tests:
- 4 Personas: User A (Org Alpha Owner), User B (Org Alpha Member), User C (Org Beta Owner), User D (Personal User)
- Tenant isolation across Matters, Searches, Evidence Ledgers, Annotations, Saved Documents, Audit Logs, Usage Metrics
- IDOR vulnerability rejection (404/403)
- Personal workspace private scoping within an organization
- Clean registration with 0 preloaded data for new users
- Class 1 Public Reference Data availability across all users
- Class 4 Internal Platform Data restriction to platform admins
- Zero Data Loss & Migration integrity verification
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.db.models import User, Organization, Workspace, Project, SearchExecution, EvidenceMapping, SavedDocument, PatentDocument

client = TestClient(app)


def test_public_reference_data_shared_globally():
    """Class 1: Public patent reference data must be globally accessible without restriction."""
    # Unauthenticated / Explore
    res = client.get("/api/v1/patents/explore?limit=5", headers={"X-API-Key": "dev_key"})
    assert res.status_code == 200
    patents = res.json()
    assert len(patents) > 0
    first_doc_id = patents[0]["id"]

    # Document view
    doc_res = client.get(f"/api/v1/documents/{first_doc_id}", headers={"X-API-Key": "dev_key"})
    assert doc_res.status_code == 200
    assert doc_res.json()["publication_number"] is not None


def test_clean_user_registration_and_empty_workspace():
    """When a new user registers, they must receive a clean, isolated personal workspace with 0 data."""
    test_email = f"inventor_{uuid.uuid4().hex[:6]}@lab.org"
    reg_payload = {
        "email": test_email,
        "full_name": "Dr. Eleanor Vance",
        "password": "SecurePassword123!",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    data = reg_res.json()
    token = data["access_token"]
    user_info = data["user"]

    assert user_info["email"] == test_email
    assert user_info["onboarding_completed"] is False
    assert user_info["default_workspace_id"] is not None
    personal_ws_id = user_info["default_workspace_id"]

    headers = {"Authorization": f"Bearer {token}", "X-Workspace-Id": personal_ws_id}

    # Verify workspace list contains the personal workspace
    ws_res = client.get("/api/v1/workspaces", headers=headers)
    assert ws_res.status_code == 200
    workspaces = ws_res.json()
    assert len(workspaces) == 1
    assert workspaces[0]["workspace_type"] == "PERSONAL"

    # Verify matters are 100% empty (Zero data leakage from existing users)
    matters_res = client.get("/api/v1/matters", headers=headers)
    assert matters_res.status_code == 200
    assert len(matters_res.json()) == 0

    # Verify saved documents are empty
    saved_res = client.get("/api/v1/saved-documents", headers=headers)
    assert saved_res.status_code == 200
    assert len(saved_res.json()) == 0

    # Verify evidence ledger is empty for this workspace
    ledger_res = client.get("/api/v1/evidence-ledger", headers=headers)
    assert ledger_res.status_code == 200
    assert len(ledger_res.json()) == 0

    # Complete onboarding
    onboard_payload = {
        "technical_domain": "Semiconductors & Battery Chemistry",
        "preferred_jurisdictions": ["US", "EP"],
        "default_search_mode": "hybrid",
    }
    onboard_res = client.post("/api/v1/user/onboarding", json=onboard_payload, headers=headers)
    assert onboard_res.status_code == 200
    assert onboard_res.json()["onboarding_completed"] is True
    assert onboard_res.json()["preferences"]["technical_domain"] == "Semiconductors & Battery Chemistry"


def test_four_persona_tenant_isolation_and_idor_prevention():
    """
    Simulates:
    - Persona A: Org Alpha Owner (Alpha Law)
    - Persona B: Org Alpha Researcher (invited by A)
    - Persona C: Org Beta Owner (Beta Innovations)
    - Persona D: Personal User (Independent Researcher)
    """
    # 1. Register Persona A (Org Alpha)
    alpha_email = f"alice_{uuid.uuid4().hex[:6]}@alphalaw.com"
    res_a = client.post("/api/v1/auth/register", json={
        "email": alpha_email,
        "full_name": "Alice Alpha, Esq.",
        "password": "Password123!",
        "organization_name": "Alpha Patent Law Group",
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    headers_a_auth = {"Authorization": f"Bearer {token_a}"}

    # Get Alpha Org workspaces
    ws_a_list = client.get("/api/v1/workspaces", headers=headers_a_auth).json()
    org_ws_a = next(w for w in ws_a_list if w["workspace_type"] == "ORGANIZATION")
    personal_ws_a = next(w for w in ws_a_list if w["workspace_type"] == "PERSONAL")
    headers_a_org = {"Authorization": f"Bearer {token_a}", "X-Workspace-Id": org_ws_a["id"]}
    headers_a_priv = {"Authorization": f"Bearer {token_a}", "X-Workspace-Id": personal_ws_a["id"]}

    # 2. Invite Persona B into Org Alpha
    bob_email = f"bob_{uuid.uuid4().hex[:6]}@alphalaw.com"
    inv_res = client.post("/api/v1/organization/invite", json={
        "email": bob_email,
        "role": "RESEARCHER"
    }, headers=headers_a_org)
    assert inv_res.status_code == 200

    # Login Persona B
    login_b = client.post("/api/v1/auth/login", json={"email": bob_email, "password": "patent2026"})
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b_org = {"Authorization": f"Bearer {token_b}", "X-Workspace-Id": org_ws_a["id"]}

    # 3. Register Persona C (Org Beta)
    beta_email = f"carol_{uuid.uuid4().hex[:6]}@betatech.com"
    res_c = client.post("/api/v1/auth/register", json={
        "email": beta_email,
        "full_name": "Carol Beta, CTO",
        "password": "Password123!",
        "organization_name": "Beta Quantum Innovations",
    })
    assert res_c.status_code == 200
    token_c = res_c.json()["access_token"]
    ws_c_list = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token_c}"}).json()
    org_ws_c = next(w for w in ws_c_list if w["workspace_type"] == "ORGANIZATION")
    headers_c_org = {"Authorization": f"Bearer {token_c}", "X-Workspace-Id": org_ws_c["id"]}

    # 4. Register Persona D (Personal User)
    david_email = f"david_{uuid.uuid4().hex[:6]}@inventor.org"
    res_d = client.post("/api/v1/auth/register", json={
        "email": david_email,
        "full_name": "David Solo Inventor",
        "password": "Password123!",
    })
    assert res_d.status_code == 200
    token_d = res_d.json()["access_token"]
    ws_d_list = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token_d}"}).json()
    personal_ws_d = ws_d_list[0]
    headers_d = {"Authorization": f"Bearer {token_d}", "X-Workspace-Id": personal_ws_d["id"]}

    # --- Test Case 1: Matter Creation in Org Alpha ---
    matter_payload = {
        "name": "Alpha Solid-State Battery Patent Challenge",
        "client_name": "Alpha Energy Systems",
        "technical_domain": "Energy Storage",
        "jurisdiction": "US",
    }
    m1_res = client.post("/api/v1/matters", json=matter_payload, headers=headers_a_org)
    assert m1_res.status_code == 200
    m1_id = m1_res.json()["id"]

    # Persona B (same org, same workspace) can see M1
    matters_b = client.get("/api/v1/matters", headers=headers_b_org).json()
    assert any(m["id"] == m1_id for m in matters_b)

    # Persona C (Org Beta) CANNOT see M1 in list
    matters_c = client.get("/api/v1/matters", headers=headers_c_org).json()
    assert not any(m["id"] == m1_id for m in matters_c)

    # Persona D (Personal User) CANNOT see M1 in list
    matters_d = client.get("/api/v1/matters", headers=headers_d).json()
    assert not any(m["id"] == m1_id for m in matters_d)

    # --- Test Case 2: IDOR Prevention on Matter Detail ---
    # Persona C attempting to access M1 directly via ID MUST receive 404
    idor_c = client.get(f"/api/v1/matters/{m1_id}", headers=headers_c_org)
    assert idor_c.status_code == 404

    # Persona D attempting to access M1 directly MUST receive 404
    idor_d = client.get(f"/api/v1/matters/{m1_id}", headers=headers_d)
    assert idor_d.status_code == 404

    # Persona C attempting to forge X-Workspace-Id to Org Alpha's workspace MUST receive 403 Forbidden
    forged_c = client.get(f"/api/v1/matters/{m1_id}", headers={
        "Authorization": f"Bearer {token_c}",
        "X-Workspace-Id": org_ws_a["id"]
    })
    assert forged_c.status_code == 403

    # --- Test Case 3: Personal Workspace Privacy within Organization ---
    # Alice creates a confidential private matter in her PERSONAL workspace
    priv_matter_res = client.post("/api/v1/matters", json={
        "name": "Alice Private Invention Diary",
        "technical_domain": "Personal IP",
    }, headers=headers_a_priv)
    assert priv_matter_res.status_code == 200
    priv_matter_id = priv_matter_res.json()["id"]

    # Bob (even though in Org Alpha) CANNOT see Alice's personal matter
    assert not any(m["id"] == priv_matter_id for m in client.get("/api/v1/matters", headers=headers_b_org).json())

    # Bob attempting to forge X-Workspace-Id to Alice's personal workspace MUST receive 403
    bob_probe = client.get(f"/api/v1/matters/{priv_matter_id}", headers={
        "Authorization": f"Bearer {token_b}",
        "X-Workspace-Id": personal_ws_a["id"]
    })
    assert bob_probe.status_code == 403

    # --- Test Case 4: Search & Evidence Ledger Isolation ---
    claim_text = "A lithium secondary battery comprising a silicon-graphite composite anode and a fluoroethylene carbonate electrolyte."
    search_res = client.post("/api/v1/search", json={
        "raw_claim": claim_text,
        "project_id": m1_id,
    }, headers=headers_a_org)
    assert search_res.status_code == 200
    search_id = search_res.json()["search_id"]

    # Persona A and B can see the evidence ledger entries in Org Alpha
    ledger_a = client.get("/api/v1/evidence-ledger", headers=headers_a_org).json()
    assert len(ledger_a) > 0

    # Persona C (Beta) sees 0 evidence ledger entries in their workspace
    ledger_c = client.get("/api/v1/evidence-ledger", headers=headers_c_org).json()
    assert len(ledger_c) == 0

    # Persona C cannot access Persona A's search execution (IDOR test -> 404)
    search_c_idor = client.get(f"/api/v1/searches/{search_id}", headers=headers_c_org)
    assert search_c_idor.status_code == 404

    # --- Test Case 5: Saved Document Isolation ---
    save_doc_res = client.post("/api/v1/saved-documents", json={
        "doc_id": "US10892482B2",
        "tags": ["Confidential-Strategy-Alpha"],
        "notes": "Key reference for litigation defense."
    }, headers=headers_a_org)
    assert save_doc_res.status_code == 200

    saved_c = client.get("/api/v1/saved-documents", headers=headers_c_org).json()
    assert len(saved_c) == 0

    # --- Test Case 6: Telemetry and Audit Log Isolation ---
    audit_a = client.get("/api/v1/organization/audit-logs", headers=headers_a_org).json()
    assert any(log["action"] == "SEARCH" for log in audit_a)

    audit_c = client.get("/api/v1/organization/audit-logs", headers=headers_c_org).json()
    # Persona C's audit log should NOT contain Persona A's SEARCH action
    for log in audit_c:
        assert log.get("user_email") != alpha_email


def test_internal_platform_data_restricted_to_admins():
    """Class 4: Evaluation benchmarks and internal ablations must return 403 to non-admin users."""
    # Register non-admin researcher
    user_email = f"researcher_{uuid.uuid4().hex[:6]}@practice.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": user_email,
        "full_name": "Junior Researcher",
        "password": "Password123!",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access internal benchmarks
    bench_res = client.get("/api/v1/eval/benchmarks", headers=headers)
    assert bench_res.status_code == 403
    assert "restricted" in bench_res.json()["detail"].lower()

    # Attempt to trigger on-demand benchmark run
    run_res = client.post("/api/v1/eval/run", headers=headers)
    assert run_res.status_code == 403

    # Attempt to access eval_latest
    latest_res = client.get("/api/v1/eval/latest", headers=headers)
    assert latest_res.status_code == 403

    # Platform admin access (via dev_key or admin account) succeeds
    admin_res = client.get("/api/v1/eval/latest", headers={"X-API-Key": "dev_key"})
    assert admin_res.status_code == 200


def test_zero_data_loss_migration_verification():
    """Verifies that all 30 pre-existing matters, 96 searches, 384 evidence mappings, and 52 patents remain intact."""
    with SessionLocal() as db:
        from sqlalchemy import text
        db.execute(text("SELECT set_config('app.is_platform_admin', 'true', false)"))
        patents_count = db.query(PatentDocument).count()
        assert patents_count >= 52

        projects_count = db.query(Project).count()
        assert projects_count >= 30

        searches_count = db.query(SearchExecution).count()
        assert searches_count >= 96

        evidence_count = db.query(EvidenceMapping).count()
        assert evidence_count >= 384

        # Verify no orphaned records without workspace_id
        orphan_projects = db.query(Project).filter(Project.workspace_id.is_(None)).count()
        assert orphan_projects == 0

        orphan_searches = db.query(SearchExecution).filter(SearchExecution.workspace_id.is_(None)).count()
        assert orphan_searches == 0

        orphan_evidence = db.query(EvidenceMapping).filter(EvidenceMapping.workspace_id.is_(None)).count()
        assert orphan_evidence == 0


def test_cross_workspace_relationship_rejection():
    """Every cross-workspace relationship must be strictly rejected (400 Bad Request or 404 Not Found via kernel RLS)."""
    # 1. Create Workspace A & Matter A
    email_a = f"owner_a_{uuid.uuid4().hex[:6]}@firm-a.com"
    res_a = client.post("/api/v1/auth/register", json={
        "email": email_a,
        "full_name": "Attorney A",
        "password": "Password123!",
        "organization_name": "Firm Alpha",
    })
    token_a = res_a.json()["access_token"]
    ws_a = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token_a}"}).json()[1]
    m_a = client.post("/api/v1/matters", json={
        "name": "Firm Alpha Proprietary Patent Matter",
    }, headers={"Authorization": f"Bearer {token_a}", "X-Workspace-Id": ws_a["id"]}).json()

    # 2. Create Workspace B
    email_b = f"owner_b_{uuid.uuid4().hex[:6]}@firm-b.com"
    res_b = client.post("/api/v1/auth/register", json={
        "email": email_b,
        "full_name": "Attorney B",
        "password": "Password123!",
        "organization_name": "Firm Beta",
    })
    token_b = res_b.json()["access_token"]
    ws_b = client.get("/api/v1/workspaces", headers={"Authorization": f"Bearer {token_b}"}).json()[1]

    # 3. User B attempts to attach their search to Matter A in Workspace A
    cross_search_res = client.post("/api/v1/search", json={
        "raw_claim": "A solid-state battery with silicon composite anode.",
        "project_id": m_a["id"],  # Belongs to Workspace A!
    }, headers={"Authorization": f"Bearer {token_b}", "X-Workspace-Id": ws_b["id"]})

    # MUST be rejected with 400 Bad Request or 404 Not Found (kernel RLS hiding foreign matter)
    assert cross_search_res.status_code in [400, 404]
    detail = cross_search_res.json()["detail"].lower()
    assert "cross-workspace" in detail or "not found" in detail


def test_customer_account_lifecycle_and_takeout():
    """Tests password recovery, data takeout export, and cascading account deletion."""
    email = f"inventor_{uuid.uuid4().hex[:6]}@pilot-customer.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Dr. Pilot Customer",
        "password": "InitialPassword123!",
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    ws_id = reg.json()["user"]["default_workspace_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Workspace-Id": ws_id}

    # 1. Create a personal matter
    m_res = client.post("/api/v1/matters", json={"name": "Pilot Research Project"}, headers=headers)
    assert m_res.status_code == 200

    # 2. Password recovery request
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json()["reset_token"]
    assert reset_token is not None

    # 3. Reset password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewUltraSecurePassword456!",
    })
    assert reset_res.status_code == 200

    # 4. Login with old password fails
    fail_login = client.post("/api/v1/auth/login", json={"email": email, "password": "InitialPassword123!"})
    assert fail_login.status_code == 401

    # 5. Login with new password succeeds
    good_login = client.post("/api/v1/auth/login", json={"email": email, "password": "NewUltraSecurePassword456!"})
    assert good_login.status_code == 200
    new_token = good_login.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}", "X-Workspace-Id": ws_id}

    # 6. GDPR Data Takeout Export
    takeout_res = client.get("/api/v1/user/export-data", headers=new_headers)
    assert takeout_res.status_code == 200
    takeout = takeout_res.json()
    assert takeout["user_profile"]["email"] == email
    assert len(takeout["matters"]) == 1
    assert takeout["matters"][0]["name"] == "Pilot Research Project"

    # 7. Cascading Account Deletion
    del_res = client.delete("/api/v1/user/account", headers=new_headers)
    assert del_res.status_code == 200

    # 8. Post-deletion login fails
    post_del_login = client.post("/api/v1/auth/login", json={"email": email, "password": "NewUltraSecurePassword456!"})
    assert post_del_login.status_code == 401


def test_platform_admin_support_session_lifecycle():
    """Tests time-limited, logged platform admin support sessions on customer workspaces."""
    # 1. Customer creates a private personal workspace
    client_email = f"client_{uuid.uuid4().hex[:6]}@acme-defense.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": client_email,
        "full_name": "Acme Defense Counsel",
        "password": "Password123!",
    })
    client_ws_id = reg.json()["user"]["default_workspace_id"]
    client_token = reg.json()["access_token"]
    client_headers = {"Authorization": f"Bearer {client_token}", "X-Workspace-Id": client_ws_id}

    m = client.post("/api/v1/matters", json={"name": "Confidential Laser Radar Defense"}, headers=client_headers).json()
    matter_id = m["id"]

    # 2. Login as Platform Admin (Sarah Jenkins)
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@patentsearchengine.com",
        "password": "patent2026",
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Admin attempts to probe client's personal workspace WITHOUT support session -> 403 Forbidden
    unauthorized_probe = client.get(f"/api/v1/matters/{matter_id}", headers={
        "Authorization": f"Bearer {admin_token}",
        "X-Workspace-Id": client_ws_id,
    })
    assert unauthorized_probe.status_code == 403

    # 4. Admin starts logged support session
    start_session = client.post("/api/v1/admin/support-session/start", json={
        "workspace_id": client_ws_id,
        "ticket_reference": "TICKET-SUPPORT-1042",
        "reason": "Customer reported discrepancy in claim chart generation",
        "duration_minutes": 30,
    }, headers=admin_headers)
    assert start_session.status_code == 200
    session_id = start_session.json()["session_id"]

    # 5. Admin can now inspect workspace in SUPPORT_AUDITOR mode
    authorized_view = client.get(f"/api/v1/matters/{matter_id}", headers={
        "Authorization": f"Bearer {admin_token}",
        "X-Workspace-Id": client_ws_id,
    })
    assert authorized_view.status_code == 200
    assert authorized_view.json()["name"] == "Confidential Laser Radar Defense"

    # 6. Admin terminates support session
    term_res = client.post(f"/api/v1/admin/support-session/{session_id}/terminate", headers=admin_headers)
    assert term_res.status_code == 200

    # 7. Access is revoked immediately -> 403 Forbidden
    post_term_probe = client.get(f"/api/v1/matters/{matter_id}", headers={
        "Authorization": f"Bearer {admin_token}",
        "X-Workspace-Id": client_ws_id,
    })
    assert post_term_probe.status_code == 403


def test_matter_level_ethical_wall_isolation():
    """
    Law firm ethical wall verification:
    Within the SAME organization workspace, confidential matters cannot be accessed
    by other firm attorneys unless explicitly enrolled as matter members.
    """
    # 1. Register Partner A (firm administrator)
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"partner_a_{uuid.uuid4().hex[:6]}@lawfirm.example.com",
        "password": "FirmPassword2026!",
        "full_name": "Partner Alice",
        "organization_name": "Apex IP Law LLP",
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    user_a_id = res_a.json()["user"]["id"]
    headers_auth_a = {"Authorization": f"Bearer {token_a}"}

    # Retrieve Alice's organization workspace
    ws_list_a = client.get("/api/v1/workspaces", headers=headers_auth_a).json()
    org_ws = next((w for w in ws_list_a if w["workspace_type"] == "ORGANIZATION"), None)
    assert org_ws is not None, "Organization workspace must be provisioned"
    ws_firm_id = org_ws["id"]
    headers_a = {"Authorization": f"Bearer {token_a}", "X-Workspace-Id": ws_firm_id}

    # 2. Partner A invites Associate Bob to the law firm organization
    bob_email = f"attorney_b_{uuid.uuid4().hex[:6]}@lawfirm.example.com"
    invite_res = client.post("/api/v1/organization/invite", json={
        "email": bob_email,
        "role": "ANALYST",
    }, headers=headers_a)
    assert invite_res.status_code == 200
    user_b_id = invite_res.json()["user_id"]

    # Bob logs into the platform
    login_b = client.post("/api/v1/auth/login", json={"email": bob_email, "password": "patent2026"})
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Workspace-Id": ws_firm_id}

    # 3. Partner A creates a confidential matter for Client Alphabet
    create_matter_res = client.post("/api/v1/matters", json={
        "name": "Project Titan Autonomous Battery",
        "matter_number": "FIRM-2026-TITAN",
        "client_name": "Confidential Auto Client",
        "jurisdiction": "US",
        "technical_domain": "Solid-State Batteries",
        "is_confidential": True,
        "notes": "Strict ethical wall: conflicting automotive representation active.",
    }, headers=headers_a)
    assert create_matter_res.status_code == 200
    matter_id = create_matter_res.json()["id"]

    # 4. Attorney B lists matters in the same workspace -> Confidential matter MUST NOT appear
    b_list = client.get("/api/v1/matters", headers=headers_b)
    assert b_list.status_code == 200
    assert not any(m["id"] == matter_id for m in b_list.json())

    # 5. Attorney B probes direct ID access -> 403 Forbidden
    b_probe = client.get(f"/api/v1/matters/{matter_id}", headers=headers_b)
    assert b_probe.status_code == 403
    assert "Ethical Wall" in b_probe.json()["detail"]

    # 6. Partner A adds Attorney B to the matter
    add_b_to_matter = client.post(f"/api/v1/matters/{matter_id}/members", json={
        "user_id": user_b_id,
        "role": "ATTORNEY",
    }, headers=headers_a)
    assert add_b_to_matter.status_code == 200
    assert add_b_to_matter.json()["user_id"] == user_b_id

    # 7. Attorney B lists matters -> Now visible!
    b_list_after = client.get("/api/v1/matters", headers=headers_b)
    assert b_list_after.status_code == 200
    assert any(m["id"] == matter_id for m in b_list_after.json())

    # 8. Attorney B accesses matter details -> 200 OK
    b_access = client.get(f"/api/v1/matters/{matter_id}", headers=headers_b)
    assert b_access.status_code == 200
    assert b_access.json()["name"] == "Project Titan Autonomous Battery"

    # 9. Partner A removes Attorney B from matter
    del_res = client.delete(f"/api/v1/matters/{matter_id}/members/{user_b_id}", headers=headers_a)
    assert del_res.status_code == 200

    # 10. Attorney B direct access is immediately barred again -> 403 Forbidden
    b_barred = client.get(f"/api/v1/matters/{matter_id}", headers=headers_b)
    assert b_barred.status_code == 403



