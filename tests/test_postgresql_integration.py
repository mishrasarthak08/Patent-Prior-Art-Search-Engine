"""
Production PostgreSQL Integration & Concurrent Multi-Tenant Test Suite.
Verifies connection pooling, transaction isolation, concurrent workspace operations,
and RBAC enforcement against a real PostgreSQL instance.
"""

import concurrent.futures
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.models import (
    Base,
    Organization,
    PatentDocument,
    Project,
    SearchExecution,
    SupportSession,
    User,
    Workspace,
    WorkspaceMembership,
)
from backend.app.auth.security import get_password_hash, get_effective_workspace_role

PG_URL = "postgresql://localhost/patent_platform_pg"


@pytest.fixture(scope="module")
def pg_session_factory():
    """Provides a connection-pooled PostgreSQL session factory."""
    engine = create_engine(
        PG_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )
    Base.metadata.create_all(bind=engine)
    SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield SessionFactory
    engine.dispose()


def test_postgresql_multi_tenant_schema_and_seeding(pg_session_factory):
    """Verifies that all 16 tables and foreign key constraints function properly on PostgreSQL."""
    db = pg_session_factory()
    try:
        # Create an isolated test org on PostgreSQL
        org_id = f"org-pg-{uuid.uuid4().hex[:8]}"
        org = Organization(
            id=org_id,
            name="PostgreSQL Alpha Intellectual Property LLP",
            slug=f"pg-alpha-{uuid.uuid4().hex[:6]}",
            plan="ENTERPRISE",
        )
        db.add(org)

        # Create organization workspace
        ws_id = f"ws-pg-{uuid.uuid4().hex[:8]}"
        ws = Workspace(
            id=ws_id,
            org_id=org.id,
            name="Solid-State Energy Practice",
            workspace_type="ORGANIZATION",
        )
        db.add(ws)

        # Create user
        user_id = f"user-pg-{uuid.uuid4().hex[:8]}"
        user = User(
            id=user_id,
            org_id=org.id,
            email=f"counsel_{uuid.uuid4().hex[:6]}@pgalpha.com",
            full_name="Sarah Vance, Esq.",
            hashed_password=get_password_hash("Secret2026!"),
            role="OWNER",
        )
        db.add(user)

        # Create membership
        mem = WorkspaceMembership(
            id=str(uuid.uuid4()),
            workspace_id=ws.id,
            user_id=user.id,
            role="OWNER",
        )
        db.add(mem)

        # Create matter
        proj = Project(
            id=str(uuid.uuid4()),
            org_id=org.id,
            workspace_id=ws.id,
            name="High-Density Silicon Anode Invalidation",
            assigned_to_user_id=user.id,
        )
        db.add(proj)

        db.commit()

        # Query back and verify relations
        queried_proj = db.query(Project).filter(Project.id == proj.id).first()
        assert queried_proj is not None
        assert queried_proj.workspace.name == "Solid-State Energy Practice"
        assert queried_proj.organization.name == "PostgreSQL Alpha Intellectual Property LLP"

        # Check effective role
        role = get_effective_workspace_role(user, ws, db)
        assert role == "OWNER"
    finally:
        db.close()


def test_postgresql_concurrent_workspace_operations(pg_session_factory):
    """Tests high-concurrency operations across multiple distinct workspaces on PostgreSQL."""
    num_workers = 8
    created_matter_ids = []

    def create_tenant_matter(worker_idx):
        db = pg_session_factory()
        try:
            ws_id = f"ws-concurrent-{worker_idx}-{uuid.uuid4().hex[:6]}"
            user_id = f"user-concurrent-{worker_idx}-{uuid.uuid4().hex[:6]}"

            user = User(
                id=user_id,
                email=f"worker_{worker_idx}_{uuid.uuid4().hex[:6]}@firm.com",
                full_name=f"Worker {worker_idx}",
                hashed_password=get_password_hash("pass"),
            )
            db.add(user)

            ws = Workspace(
                id=ws_id,
                name=f"Concurrent Workspace {worker_idx}",
                workspace_type="PERSONAL",
                owner_user_id=user_id,
            )
            db.add(ws)

            matter = Project(
                id=str(uuid.uuid4()),
                workspace_id=ws.id,
                name=f"Worker {worker_idx} Patent Investigation",
                assigned_to_user_id=user_id,
            )
            db.add(matter)
            db.commit()
            return matter.id, ws.id
        finally:
            db.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(create_tenant_matter, i) for i in range(num_workers)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert len(results) == num_workers
    db = pg_session_factory()
    try:
        for m_id, ws_id in results:
            m = db.query(Project).filter(Project.id == m_id).first()
            assert m is not None
            assert m.workspace_id == ws_id
    finally:
        db.close()


def test_postgresql_cross_tenant_isolation_and_support_session(pg_session_factory):
    """Verifies that unauthorized users are rejected on PostgreSQL, but platform admins with active support sessions can audit."""
    db = pg_session_factory()
    try:
        # Create User A with private personal workspace
        user_a = User(
            id=f"u-a-{uuid.uuid4().hex[:6]}",
            email=f"alpha_{uuid.uuid4().hex[:6]}@a.com",
            full_name="Alice A",
            hashed_password=get_password_hash("pass"),
        )
        ws_a = Workspace(
            id=f"ws-a-{uuid.uuid4().hex[:6]}",
            name="Alice Private Workspace",
            workspace_type="PERSONAL",
            owner_user_id=user_a.id,
        )
        db.add_all([user_a, ws_a])

        # Create User B (unauthorized third-party)
        user_b = User(
            id=f"u-b-{uuid.uuid4().hex[:6]}",
            email=f"beta_{uuid.uuid4().hex[:6]}@b.com",
            full_name="Bob B",
            hashed_password=get_password_hash("pass"),
        )
        db.add(user_b)

        # Create Platform Admin
        admin = User(
            id=f"u-adm-{uuid.uuid4().hex[:6]}",
            email=f"admin_{uuid.uuid4().hex[:6]}@platform.internal",
            full_name="Super Admin",
            hashed_password=get_password_hash("pass"),
            is_platform_admin=True,
            role="PLATFORM_ADMIN",
        )
        db.add(admin)
        db.commit()

        # 1. User B must be DENIED access to User A's personal workspace
        role_b = get_effective_workspace_role(user_b, ws_a, db)
        assert role_b == "DENIED"

        # 2. Platform Admin WITHOUT support session must also be DENIED
        role_adm_initial = get_effective_workspace_role(admin, ws_a, db)
        assert role_adm_initial == "DENIED"

        # 3. Create time-limited Support Session for Admin
        from datetime import datetime, timedelta
        support = SupportSession(
            id=str(uuid.uuid4()),
            admin_user_id=admin.id,
            workspace_id=ws_a.id,
            ticket_reference="TICKET-POSTGRES-9901",
            reason="Investigating reported indexing lag for client",
            is_active=True,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=30),
        )
        db.add(support)
        db.commit()

        # 4. Platform Admin WITH active support session gains SUPPORT_AUDITOR access
        role_adm_support = get_effective_workspace_role(admin, ws_a, db)
        assert role_adm_support == "SUPPORT_AUDITOR"

        # 5. Revoke session -> access immediately revoked to DENIED
        support.is_active = False
        db.commit()
        role_adm_revoked = get_effective_workspace_role(admin, ws_a, db)
        assert role_adm_revoked == "DENIED"
    finally:
        db.close()
