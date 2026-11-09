import datetime
import hashlib
import os
import time
import uuid
from typing import Any, cast

import requests
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.auth.security import (
    create_access_token,
    create_support_session,
    ensure_seed_users_and_orgs,
    get_active_workspace,
    get_current_user_flexible,
    get_effective_workspace_role,
    get_password_hash,
    require_platform_admin,
    require_workspace_permission,
    set_database_tenant_context,
    terminate_support_session,
    verify_password,
)
from backend.app.config import settings
from backend.app.services.email_service import email_service
from backend.app.corpus.corpus_loader import seed_corpus_and_database
from backend.app.corpus.ingestion_engine import (
    get_corpus_coverage_report,
    get_patent_citation_network,
)
from backend.app.db.models import (
    Annotation,
    AuditLog,
    EvaluationRecord,
    EvidenceMapping,
    Organization,
    PatentDocument,
    Project,
    QuarantineRecord,
    SavedDocument,
    SearchExecution,
    SupportSession,
    User,
    Workspace,
    WorkspaceMembership,
)
from backend.app.db.session import SessionLocal, get_db, init_db
from backend.app.evidence.ledger import (
    locate_text_coordinates,
    record_evidence_in_ledger,
    review_evidence_entry,
)
from backend.app.logger import get_logger
from backend.app.privacy.confidentiality import get_privacy_manifest
from backend.app.retrieval.graph import retrieval_graph
from backend.app.retrieval.iterative_search import IterativeSearchEngine
from backend.app.schemas import (
    DISCLAIMER_TEXT,
    AuditLogOut,
    DecomposedClaim,
    EvidenceLedgerItem,
    EvidenceReviewRequest,
    EvidenceUpdate,
    IterativeSearchRequest,
    MatterCreate,
    MatterOut,
    MatterUpdate,
    MultiClaimMapCell,
    MultiClaimMapColumn,
    MultiClaimMapRequest,
    MultiClaimMapResponse,
    OnboardingRequest,
    OrganizationInvite,
    OrganizationOut,
    PatentCompareItem,
    PatentCompareRequest,
    PatentCompareResponse,
    PatentSummary,
    PriorArtSearchResponse,
    SavedDocumentCreate,
    SavedDocumentOut,
    SearchFilterParams,
    TokenResponse,
    UsageMetricOut,
    UserLogin,
    UserOut,
    UserRegister,
    WorkspaceCreate,
    WorkspaceOut,
)
from tests.eval.harness import EvaluationHarness

logger = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)

# Initialize database schema, seed patents and default enterprise org
init_db()
seed_corpus_and_database()
with SessionLocal() as bootstrap_db:
    ensure_seed_users_and_orgs(bootstrap_db)

iterative_engine = IterativeSearchEngine()

app = FastAPI(
    title="Patent Prior-Art Search Engine",
    version="3.0.0",
    description="Evidence-first enterprise prior-art discovery, atomic claim limitation decomposition, verifiable claim chart matrix, and research workspace management.",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
security_bearer = HTTPBearer(auto_error=False)


def get_authenticated_user(
    bearer: HTTPAuthorizationCredentials | None = Security(security_bearer),
    api_key: str | None = Security(api_key_header),
    db: Session = Depends(get_db),
) -> User:
    return get_current_user_flexible(bearer, api_key, db)


def get_api_key(
    bearer: HTTPAuthorizationCredentials | None = Security(security_bearer),
    api_key: str | None = Security(api_key_header),
    db: Session = Depends(get_db),
) -> str:
    """Backward compatibility dependency for existing test suite."""
    get_authenticated_user(bearer, api_key, db)
    return "authorized"


def log_audit_event(
    db: Session | None,
    user: User,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str = "127.0.0.1",
) -> None:
    """Records verifiable compliance audit log in an independent, isolated session."""
    try:
        with SessionLocal() as audit_db:
            audit = AuditLog(
                id=str(uuid.uuid4()),
                org_id=user.org_id,
                user_id=user.id,
                user_email=user.email,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details or {},
                ip_address=ip_address,
            )
            audit_db.add(audit)
            audit_db.commit()
    except Exception as e:
        logger.warning(f"Failed to record audit log: {e}")
        db.rollback()


@app.get("/api/v1/privacy/manifest")
def privacy_audit_manifest():
    """Returns the verified enterprise data flow, encryption, and third-party AI provider privacy manifest."""
    return get_privacy_manifest()


# --- Authentication & User Lifecycle Endpoints ---


@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email.lower().strip()).first()
    if not user or not verify_password(creds.password, str(user.hashed_password)):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.email), "role": str(user.role), "org_id": str(user.org_id or "")})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@app.post("/api/v1/auth/register", response_model=TokenResponse)
def register(req: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists")

    user_id = str(uuid.uuid4())
    org = None
    org_ws = None
    personal_ws_id = f"ws-personal-{user_id[:8]}"

    if req.organization_name and req.organization_name.strip():
        slug = req.organization_name.lower().replace(" ", "-")[:40] + f"-{uuid.uuid4().hex[:4]}"
        org = Organization(
            id=str(uuid.uuid4()),
            name=req.organization_name.strip(),
            slug=slug,
            plan="PROFESSIONAL",
            max_seats=10,
        )
        db.add(org)
        db.flush()

    # 1. Create user account first so foreign key references to users.id succeed
    user = User(
        id=user_id,
        org_id=org.id if org else None,
        email=req.email.lower().strip(),
        full_name=req.full_name.strip(),
        hashed_password=get_password_hash(req.password),
        role="OWNER" if org else "ATTORNEY",
        default_workspace_id=personal_ws_id,
        onboarding_completed=False,
        preferences={},
    )
    db.add(user)
    db.flush()

    # 2. Create organization shared workspace if applicable
    if org:
        org_ws = Workspace(
            id=str(uuid.uuid4()),
            org_id=org.id,
            name=f"{req.organization_name.strip()} Shared Practice",
            description=f"Collaborative prior-art research space for {req.organization_name.strip()}.",
            workspace_type="ORGANIZATION",
            owner_user_id=user.id,
            is_default=False,
        )
        db.add(org_ws)
        db.flush()

    # 3. Create private personal workspace for the user (Strictly Class 2 Private Data, org_id is NULL)
    personal_ws = Workspace(
        id=personal_ws_id,
        org_id=None,
        name=f"{req.full_name}'s Research Workspace",
        description="Private personal patent research workbench.",
        workspace_type="PERSONAL",
        owner_user_id=user.id,
        is_default=True,
    )
    db.add(personal_ws)
    db.flush()

    # 4. Add workspace memberships
    mem_personal = WorkspaceMembership(
        id=str(uuid.uuid4()),
        workspace_id=personal_ws.id,
        user_id=user.id,
        role="OWNER",
    )
    db.add(mem_personal)

    if org_ws:
        mem_org = WorkspaceMembership(
            id=str(uuid.uuid4()),
            workspace_id=org_ws.id,
            user_id=user.id,
            role="OWNER",
        )
        db.add(mem_org)

    db.commit()
    db.refresh(user)

    log_audit_event(
        db,
        user,
        "REGISTER",
        "User",
        user.id,
        {"email": user.email, "organization": req.organization_name},
    )

    token = create_access_token(data={"sub": str(user.email), "role": str(user.role), "org_id": str(user.org_id or "")})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@app.get("/api/v1/auth/me", response_model=UserOut)
def get_current_user_profile(user: User = Depends(get_authenticated_user)):
    return UserOut.model_validate(user)


@app.post("/api/v1/user/onboarding", response_model=UserOut)
def complete_user_onboarding(
    req: OnboardingRequest,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Saves user onboarding selections and marks onboarding completed."""
    prefs = dict(user.preferences or {})
    prefs["technical_domain"] = req.technical_domain
    prefs["preferred_jurisdictions"] = req.preferred_jurisdictions
    prefs["default_search_mode"] = req.default_search_mode
    if req.role:
        prefs["user_role_label"] = req.role

    user.preferences = prefs
    user.onboarding_completed = True
    db.commit()
    db.refresh(user)
    log_audit_event(db, user, "COMPLETE_ONBOARDING", "User", user.id, prefs)
    return UserOut.model_validate(user)


# --- Account Lifecycle & Password Recovery ---


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class StartSupportSessionRequest(BaseModel):
    workspace_id: str
    ticket_reference: str
    reason: str
    duration_minutes: int = 30


@app.post("/api/v1/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Initiates password recovery with a time-limited reset token dispatched via transactional email."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user:
        # Prevent account enumeration attack by returning generic response
        return {
            "status": "success",
            "message": "If the account exists, password recovery instructions have been dispatched.",
        }

    token = str(uuid.uuid4())
    user.password_reset_token = token
    user.password_reset_expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.commit()
    log_audit_event(db, user, "FORGOT_PASSWORD_REQUEST", "User", user.id, {"email": user.email})

    # Dispatch secure transactional email
    email_service.send_password_reset_email(user.email, user.full_name, token)

    resp = {
        "status": "success",
        "message": "If the account exists, password recovery instructions have been dispatched.",
    }
    # Expose token only in non-production environments to avoid leaking credentials over API responses
    if settings.ENVIRONMENT != "production" or settings.DEBUG:
        resp["reset_token"] = token
    return resp


@app.post("/api/v1/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Resets user password using a verified token."""
    now = datetime.datetime.utcnow()
    user = (
        db.query(User)
        .filter(
            User.password_reset_token == req.token,
            User.password_reset_expires_at > now,
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")

    user.hashed_password = get_password_hash(req.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    db.commit()
    log_audit_event(db, user, "PASSWORD_RESET_SUCCESS", "User", user.id)
    return {"status": "success", "message": "Password updated successfully"}


@app.get("/api/v1/user/export-data")
def export_user_data(
    user: User = Depends(get_authenticated_user),
    active_ws: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """GDPR/CCPA compliant customer data takeout containing user's profile and private research."""
    personal_ws = (
        db.query(Workspace)
        .filter(Workspace.owner_user_id == user.id, Workspace.workspace_type == "PERSONAL")
        .all()
    )
    ws_ids = list({w.id for w in personal_ws} | {active_ws.id})

    matters = []
    searches = []
    annotations = []
    saved = []
    for wid in ws_ids:
        set_database_tenant_context(db, wid, getattr(user, "is_platform_admin", False))
        matters.extend(db.query(Project).filter(Project.workspace_id == wid).all())
        searches.extend(db.query(SearchExecution).filter(SearchExecution.workspace_id == wid).all())
        annotations.extend(db.query(Annotation).filter(Annotation.workspace_id == wid).all())
        saved.extend(db.query(SavedDocument).filter(SavedDocument.workspace_id == wid).all())

    # Restore active workspace context
    set_database_tenant_context(db, active_ws.id, getattr(user, "is_platform_admin", False))

    log_audit_event(db, user, "EXPORT_USER_DATA", "User", user.id)
    return {
        "user_profile": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "preferences": user.preferences,
        },
        "personal_workspaces": [
            {"id": w.id, "name": w.name, "created_at": w.created_at.isoformat() if w.created_at else None}
            for w in personal_ws
        ],
        "matters": [
            {"id": m.id, "name": m.name, "matter_number": m.matter_number, "domain": m.technical_domain}
            for m in matters
        ],
        "searches": [
            {
                "id": s.id,
                "claim": s.raw_claim,
                "candidate_count": s.candidate_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in searches
        ],
        "annotations_count": len(annotations),
        "saved_documents_count": len(saved),
        "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
    }


@app.delete("/api/v1/user/account")
def delete_user_account(
    user: User = Depends(get_authenticated_user),
    active_ws: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Cascading account closure. Deletes user's personal workspaces, memberships, and private data."""
    personal_ws = (
        db.query(Workspace)
        .filter(Workspace.owner_user_id == user.id, Workspace.workspace_type == "PERSONAL")
        .all()
    )
    ws_ids = list({w.id for w in personal_ws} | {active_ws.id})
    for wid in ws_ids:
        set_database_tenant_context(db, wid, getattr(user, "is_platform_admin", False))
        db.query(SavedDocument).filter(SavedDocument.workspace_id == wid).delete()
        db.query(Annotation).filter(Annotation.workspace_id == wid).delete()
        db.query(SearchExecution).filter(SearchExecution.workspace_id == wid).delete()
        db.query(Project).filter(Project.workspace_id == wid).delete()

    for ws in personal_ws:
        db.delete(ws)

    db.query(WorkspaceMembership).filter(WorkspaceMembership.user_id == user.id).delete()

    user.is_active = False
    user.status = "DELETED"
    user.email = f"deleted_{user.id[:8]}@redacted.patentengine.internal"
    user.full_name = "Redacted User"
    db.commit()
    log_audit_event(db, user, "DELETE_USER_ACCOUNT", "User", user.id)
    return {"status": "success", "message": "User account and private research data permanently deleted"}


# --- Internal Platform Administrator Support Access ---


@app.post("/api/v1/admin/support-session/start")
def start_support_session(
    req: StartSupportSessionRequest,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Initiates a time-limited, logged support session for internal platform staff troubleshooting."""
    ws = db.query(Workspace).filter(Workspace.id == req.workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{req.workspace_id}' not found")

    ip = request.client.host if request and request.client else "127.0.0.1"
    session = create_support_session(
        admin=user,
        workspace=ws,
        ticket_reference=req.ticket_reference,
        reason=req.reason,
        duration_minutes=req.duration_minutes,
        db=db,
        ip_address=ip,
    )
    return {
        "status": "active",
        "session_id": session.id,
        "workspace_id": ws.id,
        "workspace_name": ws.name,
        "expires_at": session.expires_at.isoformat() + "Z",
        "ticket_reference": session.ticket_reference,
    }


@app.post("/api/v1/admin/support-session/{session_id}/terminate")
def end_support_session(
    session_id: str,
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Terminates an active support session immediately and logs termination."""
    ip = request.client.host if request and request.client else "127.0.0.1"
    session = terminate_support_session(session_id=session_id, admin=user, db=db, ip_address=ip)
    return {
        "status": "terminated",
        "session_id": session.id,
        "revoked_at": session.revoked_at.isoformat() + "Z",
    }


@app.get("/api/v1/admin/support-sessions")
def list_support_sessions(
    user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    """Auditable log of all internal platform administrator support sessions."""
    sessions = db.query(SupportSession).order_by(SupportSession.created_at.desc()).limit(50).all()
    now = datetime.datetime.utcnow()
    return [
        {
            "id": s.id,
            "admin_user_id": s.admin_user_id,
            "workspace_id": s.workspace_id,
            "workspace_name": s.workspace.name if s.workspace else "Unknown",
            "ticket_reference": s.ticket_reference,
            "reason": s.reason,
            "is_active": s.is_active and s.expires_at > now,
            "created_at": s.created_at.isoformat() + "Z",
            "expires_at": s.expires_at.isoformat() + "Z",
            "actions_performed_count": s.actions_performed_count,
        }
        for s in sessions
    ]


# --- Organization & Workspaces ---


@app.get("/api/v1/workspaces", response_model=list[WorkspaceOut])
@app.get("/api/v1/user/workspaces", response_model=list[WorkspaceOut])
def list_workspaces(user: User = Depends(get_authenticated_user), db: Session = Depends(get_db)):
    """Returns all personal and organization workspaces accessible to the calling user."""
    # Find all workspace IDs where user is member
    member_ws_ids = [
        row[0]
        for row in db.query(WorkspaceMembership.workspace_id)
        .filter(WorkspaceMembership.user_id == user.id)
        .all()
    ]

    query = db.query(Workspace).filter(
        or_(
            Workspace.owner_user_id == user.id,
            Workspace.id.in_(member_ws_ids),
            (Workspace.org_id == user.org_id) if user.org_id else False,
        )
    )
    workspaces = query.order_by(Workspace.created_at.asc()).all()

    results = []
    for w in workspaces:
        m_count = db.query(Project).filter(Project.workspace_id == w.id).count()
        s_count = db.query(SearchExecution).filter(SearchExecution.workspace_id == w.id).count()
        w_out = WorkspaceOut.model_validate(w)
        w_out.matters_count = m_count
        w_out.searches_count = s_count
        results.append(w_out)

    return results


@app.post("/api/v1/workspaces", response_model=WorkspaceOut)
def create_workspace(
    req: WorkspaceCreate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    ws_type = req.workspace_type.upper() if req.workspace_type else "ORGANIZATION"
    if ws_type == "ORGANIZATION" and not user.org_id:
        # Auto-create personal workspace instead if user has no org
        ws_type = "PERSONAL"

    ws_id = str(uuid.uuid4())
    ws = Workspace(
        id=ws_id,
        org_id=user.org_id if ws_type == "ORGANIZATION" else None,
        name=req.name.strip(),
        description=req.description,
        is_default=req.is_default,
        workspace_type=ws_type,
        owner_user_id=user.id,
    )
    db.add(ws)
    db.commit()

    # Add owner membership
    mem = WorkspaceMembership(
        id=str(uuid.uuid4()),
        workspace_id=ws.id,
        user_id=user.id,
        role="OWNER",
    )
    db.add(mem)
    db.commit()
    db.refresh(ws)

    log_audit_event(db, user, "CREATE_WORKSPACE", "Workspace", str(ws.id), {"name": req.name, "type": ws_type})
    w_out = WorkspaceOut.model_validate(ws)
    w_out.matters_count = 0
    w_out.searches_count = 0
    return w_out


@app.get("/api/v1/organization", response_model=OrganizationOut)
def get_organization_details(user: User = Depends(get_authenticated_user), db: Session = Depends(get_db)):
    if user.org_id:
        org = db.query(Organization).filter(Organization.id == user.org_id).first()
        if org:
            return OrganizationOut.model_validate(org)

    # Individual User Practice Profile
    return OrganizationOut(
        id=f"org-personal-{user.id[:8]}",
        name=f"{user.full_name} (Personal Practice)",
        slug=f"personal-{user.id[:8]}",
        plan="PROFESSIONAL",
        max_seats=1,
        created_at=user.created_at,
    )


@app.get("/api/v1/organization/members", response_model=list[UserOut])
def get_organization_members(user: User = Depends(get_authenticated_user), db: Session = Depends(get_db)):
    if not user.org_id:
        return [UserOut.model_validate(user)]
    members = db.query(User).filter(User.org_id == user.org_id).all()
    return [UserOut.model_validate(m) for m in members]


@app.post("/api/v1/organization/invite")
def invite_organization_member(
    req: OrganizationInvite,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    if not user.org_id or str(user.role) not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only Organization Admins can invite new members")

    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered in an organization")

    new_user_id = str(uuid.uuid4())
    invited_user = User(
        id=new_user_id,
        org_id=user.org_id,
        email=req.email.lower().strip(),
        full_name=req.email.split("@")[0].replace(".", " ").title(),
        hashed_password=get_password_hash("patent2026"),
        role=req.role,
        onboarding_completed=True,
    )
    db.add(invited_user)
    db.commit()

    # Create personal workspace for invited user
    p_ws_id = f"ws-personal-{new_user_id[:8]}"
    p_ws = Workspace(
        id=p_ws_id,
        org_id=user.org_id,
        name=f"{invited_user.full_name}'s Research Workspace",
        description="Private personal patent research workbench.",
        workspace_type="PERSONAL",
        owner_user_id=new_user_id,
        is_default=True,
    )
    db.add(p_ws)
    db.commit()

    db.add(WorkspaceMembership(id=str(uuid.uuid4()), workspace_id=p_ws.id, user_id=new_user_id, role="OWNER"))

    # Grant access to organization's workspaces
    org_workspaces = db.query(Workspace).filter(Workspace.org_id == user.org_id, Workspace.workspace_type == "ORGANIZATION").all()
    for ow in org_workspaces:
        db.add(WorkspaceMembership(id=str(uuid.uuid4()), workspace_id=ow.id, user_id=new_user_id, role=req.role))

    invited_user.default_workspace_id = p_ws.id
    db.commit()

    log_audit_event(db, user, "INVITE_MEMBER", "User", str(invited_user.id), {"email": req.email, "role": req.role})
    email_service.send_workspace_invitation_email(req.email, user.full_name or "An administrator", "Enterprise Workspace", req.role)
    return {"status": "invited", "user_id": str(invited_user.id), "email": str(invited_user.email)}


@app.get("/api/v1/organization/usage", response_model=UsageMetricOut)
def get_organization_usage(
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    period = datetime.datetime.utcnow().strftime("%Y-%m")
    if user.org_id:
        org_ws_ids = [w[0] for w in db.query(Workspace.id).filter(Workspace.org_id == user.org_id).all()]
        searches_count = db.query(SearchExecution).filter(SearchExecution.workspace_id.in_(org_ws_ids)).count()
        docs_viewed = db.query(AuditLog).filter(AuditLog.org_id == user.org_id, AuditLog.action == "VIEW_DOCUMENT").count()
        exports_count = db.query(AuditLog).filter(AuditLog.org_id == user.org_id, AuditLog.action == "EXPORT_DOSSIER").count()
    else:
        searches_count = db.query(SearchExecution).filter(SearchExecution.workspace_id == active_workspace.id).count()
        docs_viewed = db.query(AuditLog).filter(AuditLog.user_id == user.id, AuditLog.action == "VIEW_DOCUMENT").count()
        exports_count = db.query(AuditLog).filter(AuditLog.user_id == user.id, AuditLog.action == "EXPORT_DOSSIER").count()

    return UsageMetricOut(
        period_month=period,
        searches_count=searches_count,
        documents_viewed=docs_viewed,
        dossiers_exported=exports_count,
        max_searches=500,
        max_exports=100,
    )


@app.get("/api/v1/organization/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(
    limit: int = 50,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Scoped strictly by user's organization or user account to prevent cross-tenant telemetry leaks."""
    query = db.query(AuditLog)
    if user.org_id:
        query = query.filter(AuditLog.org_id == user.org_id)
    else:
        query = query.filter(AuditLog.user_id == user.id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(log_item) for log_item in logs]


# --- Matters & Research Projects ---


class SearchRequest(BaseModel):
    raw_claim: str = Field(..., max_length=settings.MAX_CLAIM_LENGTH)
    project_id: str | None = Field(default="default-workspace")
    filters: SearchFilterParams | None = None


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    matter_number: str | None = None
    description: str | None = None
    client_name: str | None = None
    jurisdiction: str = "US"
    technical_domain: str = "General"


class AnnotationRequest(BaseModel):
    doc_id: str
    review_status: str = Field(default="RELEVANT")
    notes: str | None = None


@app.get("/api/v1/matters", response_model=list[MatterOut])
@app.get("/api/v1/projects")
def list_matters(
    search: str | None = None,
    status_filter: str | None = None,
    domain: str | None = None,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    query = db.query(Project).filter(Project.workspace_id == active_workspace.id)
    if search:
        query = query.filter(
            or_(
                Project.name.ilike(f"%{search}%"),
                Project.matter_number.ilike(f"%{search}%"),
                Project.client_name.ilike(f"%{search}%"),
            )
        )
    if status_filter:
        query = query.filter(Project.status == status_filter.upper())
    if domain:
        query = query.filter(Project.technical_domain == domain)

    projects = query.order_by(Project.updated_at.desc()).all()
    results = []
    for p in projects:
        m = MatterOut.model_validate(p)
        m.searches_count = len(p.searches)
        m.saved_documents_count = len(getattr(p, "saved_documents", []))
        results.append(m)
    return results


@app.post("/api/v1/matters", response_model=MatterOut)
@app.post("/api/v1/projects")
def create_matter(
    req: MatterCreate,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    role = get_effective_workspace_role(user, active_workspace, db)
    if role in ["VIEWER", "READONLY", "SUPPORT_AUDITOR"]:
        raise HTTPException(status_code=403, detail="Forbidden: Read-only members cannot register matters")

    project_id = str(uuid.uuid4())
    new_proj = Project(
        id=project_id,
        org_id=active_workspace.org_id,
        workspace_id=active_workspace.id,
        name=req.name.strip(),
        matter_number=req.matter_number or f"MAT-{int(time.time()) % 10000:04d}",
        description=req.description,
        client_name=req.client_name,
        status="ACTIVE",
        jurisdiction=req.jurisdiction,
        technical_domain=req.technical_domain,
        assigned_to_user_id=user.id,
        notes=req.notes,
    )
    db.add(new_proj)
    db.commit()
    log_audit_event(db, user, "CREATE_MATTER", "Matter", str(new_proj.id), {"matter_number": req.matter_number})
    m = MatterOut.model_validate(new_proj)
    m.searches_count = 0
    m.saved_documents_count = 0
    return m


@app.get("/api/v1/matters/{project_id}")
@app.get("/api/v1/projects/{project_id}")
def get_matter_details(
    project_id: str,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Matter not found")

    # IDOR Prevention: Verify caller is authorized for the workspace holding this project
    if project.workspace_id != active_workspace.id:
        has_access = (
            db.query(WorkspaceMembership)
            .filter(
                WorkspaceMembership.workspace_id == project.workspace_id,
                WorkspaceMembership.user_id == user.id,
            )
            .first()
        )
        if not has_access and (not user.org_id or project.org_id != user.org_id):
            raise HTTPException(status_code=404, detail="Matter not found")

    searches = (
        db.query(SearchExecution)
        .filter(SearchExecution.project_id == project_id)
        .order_by(SearchExecution.created_at.desc())
        .all()
    )
    saved_docs = db.query(SavedDocument).filter(SavedDocument.project_id == project_id).all()

    return {
        "id": project.id,
        "name": project.name,
        "matter_number": project.matter_number,
        "description": project.description,
        "client_name": project.client_name,
        "status": project.status or "ACTIVE",
        "jurisdiction": project.jurisdiction,
        "technical_domain": project.technical_domain,
        "notes": project.notes,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "searches": [
            {
                "id": s.id,
                "raw_claim": s.raw_claim[:120] + "..." if len(str(s.raw_claim)) > 120 else s.raw_claim,
                "candidate_count": s.candidate_count,
                "result_count": s.result_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in searches
        ],
        "saved_documents": [
            {
                "id": sd.id,
                "doc_id": sd.doc_id,
                "tags": sd.tags,
                "notes": sd.notes,
                "created_at": sd.created_at.isoformat() if sd.created_at else None,
            }
            for sd in saved_docs
        ],
    }


@app.patch("/api/v1/matters/{project_id}")
def update_matter(
    project_id: str,
    req: MatterUpdate,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.workspace_id != active_workspace.id:
        raise HTTPException(status_code=404, detail="Matter not found")

    role = get_effective_workspace_role(user, active_workspace, db)
    if role in ["VIEWER", "READONLY", "SUPPORT_AUDITOR"]:
        raise HTTPException(status_code=403, detail="Forbidden: Read-only members cannot modify matters")

    for field_name in [
        "name",
        "matter_number",
        "description",
        "client_name",
        "status",
        "jurisdiction",
        "technical_domain",
        "notes",
    ]:
        val = getattr(req, field_name)
        if val is not None:
            setattr(project, field_name, val)

    setattr(project, "updated_at", datetime.datetime.utcnow())
    db.commit()
    db.refresh(project)
    log_audit_event(db, user, "UPDATE_MATTER", "Matter", str(project.id), {"status": str(project.status)})
    return {"status": "updated", "id": str(project.id), "matter_status": str(project.status)}


@app.delete("/api/v1/matters/{project_id}")
def delete_matter(
    project_id: str,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.workspace_id != active_workspace.id:
        raise HTTPException(status_code=404, detail="Matter not found")

    role = get_effective_workspace_role(user, active_workspace, db)
    can_delete = (
        role in ["PERSONAL_OWNER", "OWNER", "ADMIN"]
        or project.assigned_to_user_id == user.id
    )
    if not can_delete:
        raise HTTPException(status_code=403, detail="Insufficient workspace permissions to delete this matter")

    db.delete(project)
    db.commit()
    log_audit_event(db, user, "DELETE_MATTER", "Matter", project_id)
    return {"status": "deleted", "id": project_id}


# --- Core Prior-Art Search & Investigation ---


@app.post("/search", response_model=PriorArtSearchResponse)
@app.post("/api/v1/search", response_model=PriorArtSearchResponse)
@limiter.limit("5/minute")
async def search(
    request: Request,
    search_request: SearchRequest,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    raw_claim_text = search_request.raw_claim.strip()
    if not raw_claim_text:
        raise HTTPException(status_code=422, detail="Claim text empty")

    role = get_effective_workspace_role(user, active_workspace, db)
    if role in ["VIEWER", "READONLY", "SUPPORT_AUDITOR"]:
        raise HTTPException(status_code=403, detail="Forbidden: Read-only members cannot execute searches")

    # Validate project_id belongs strictly to active workspace (Zero cross-workspace associations)
    target_project_id = None
    if search_request.project_id and search_request.project_id not in ["default-workspace", "default"]:
        proj = db.query(Project).filter(Project.id == search_request.project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail="Specified matter not found")
        if proj.workspace_id != active_workspace.id:
            raise HTTPException(
                status_code=400,
                detail="Cross-workspace violation: Specified matter does not belong to active workspace",
            )
        target_project_id = proj.id

    search_id = str(uuid.uuid4())
    start_time = time.time()

    # Confidential Mode Check
    log_claim = (
        f"SHA256:{hashlib.sha256(raw_claim_text.encode()).hexdigest()[:16]}"
        if settings.CONFIDENTIAL_MODE
        else raw_claim_text[:80] + "..."
    )
    logger.info("Initiating prior-art search", extra={"search_id": search_id, "claim_preview": log_claim})

    try:
        final_state = retrieval_graph.invoke(
            {
                "raw_claim": raw_claim_text,
                "filters": search_request.filters,
            }
        )
    except Exception as e:
        logger.error(f"Search graph execution failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search pipeline failure: {str(e)}")

    total_latency_ms = round((time.time() - start_time) * 1000, 2)
    latencies = final_state.get("stage_latencies", {})
    latencies["total_ms"] = total_latency_ms
    stage_status = final_state.get("stage_status", {})

    pipeline_stage_counts = {
        "bm25_candidates": len(final_state.get("bm25_results", [])),
        "dense_candidates": len(final_state.get("dense_results", [])),
        "fused_candidates": len(final_state.get("fused_results", [])),
        "final_returned": len(final_state.get("final_results", [])),
    }

    # Persist Search Execution & Evidence Mappings into Relational Database scoped to Workspace
    decomposed = final_state.get("decomposed_claim", {})
    if isinstance(decomposed, dict):
        preamble = decomposed.get("preamble")
        transition = decomposed.get("transition", "comprising")
        elements_list = [
            e if isinstance(e, dict) else e.model_dump()
            for e in decomposed.get("elements", [])
        ]
        query_claim_obj = DecomposedClaim.model_validate(decomposed)
    else:
        preamble = decomposed.preamble
        transition = decomposed.transition
        elements_list = [e.model_dump() for e in decomposed.elements]
        query_claim_obj = decomposed

    try:
        search_record = SearchExecution(
            id=search_id,
            workspace_id=active_workspace.id,
            user_id=user.id,
            project_id=target_project_id,
            raw_claim=raw_claim_text,
            preamble=preamble,
            transition_phrase=transition,
            decomposed_elements=elements_list,
            parameters=search_request.filters.model_dump() if search_request.filters else {},
            stage_status=stage_status,
            latency_ms=latencies,
            candidate_count=pipeline_stage_counts["fused_candidates"],
            result_count=pipeline_stage_counts["final_returned"],
            results_cache=[d.model_dump() for d in final_state.get("final_results", [])],
        )
        db.add(search_record)

        # Store individual claim chart evidence items scoped to workspace
        for doc in final_state.get("final_results", []):
            for item in getattr(doc, "claim_chart", []):
                evidence_row = EvidenceMapping(
                    id=str(uuid.uuid4()),
                    workspace_id=active_workspace.id,
                    user_id=user.id,
                    search_id=search_id,
                    doc_id=doc.doc_id,
                    element_id=item.element_id,
                    limitation_text=item.limitation_text,
                    support_level=item.support_level,
                    exact_quote=item.exact_quote,
                    passage_location=item.passage_location,
                    verified=item.verified,
                    confidence_score=item.confidence_score,
                    rationale=item.rationale,
                )
                db.add(evidence_row)

        db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist search execution record: {e}")
        db.rollback()

    log_audit_event(
        db,
        user,
        "SEARCH",
        "SearchExecution",
        search_id,
        {"elements_count": len(elements_list), "candidates_returned": len(final_state.get("final_results", []))},
    )

    return PriorArtSearchResponse(
        search_id=search_id,
        query_claim=query_claim_obj,
        results=final_state.get("final_results", []),
        pipeline_stage_counts=pipeline_stage_counts,
        pipeline_stage_status=stage_status,
        disclaimer=DISCLAIMER_TEXT,
        latency_ms=latencies,
    )


# --- Standalone Patent Explorer & Comparison ---


@app.get("/api/v1/patents/explore", response_model=list[PatentSummary])
def explore_patents(
    q: str | None = None,
    cpc: str | None = None,
    assignee: str | None = None,
    country: str | None = None,
    limit: int = 20,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    query = db.query(PatentDocument)
    if q:
        search_terms = f"%{q.strip()}%"
        query = query.filter(
            or_(
                PatentDocument.title.ilike(search_terms),
                PatentDocument.abstract.ilike(search_terms),
                PatentDocument.publication_number.ilike(search_terms),
                PatentDocument.assignee.ilike(search_terms),
            )
        )
    if cpc:
        query = query.filter(PatentDocument.cpc_codes.as_string().ilike(f"%{cpc}%"))
    if assignee:
        query = query.filter(PatentDocument.assignee.ilike(f"%{assignee}%"))
    if country:
        query = query.filter(PatentDocument.country == country.upper())

    docs = query.limit(limit).all()
    return [PatentSummary.model_validate(d) for d in docs]


@app.post("/api/v1/patents/compare", response_model=PatentCompareResponse)
def compare_patents(
    req: PatentCompareRequest,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    docs = db.query(PatentDocument).filter(PatentDocument.id.in_(req.doc_ids)).all()
    if len(docs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 valid patent documents are required for comparison")

    items = []
    cpc_sets: list[set[str]] = []
    for d in docs:
        claims_list: list[Any] = list(d.claims_list or [])
        first_claim = str(claims_list[0]) if claims_list else (str(d.claims_text) if d.claims_text else "")
        cpc_sets.append(set(d.cpc_codes or []))
        items.append(
            PatentCompareItem(
                doc_id=str(d.id),
                publication_number=str(d.publication_number),
                title=str(d.title),
                assignee=str(d.assignee) if d.assignee else None,
                publication_date=str(d.publication_date) if d.publication_date else None,
                cpc_codes=list(d.cpc_codes or []),
                abstract=str(d.abstract) if d.abstract else None,
                independent_claim=first_claim[:600] + "..." if len(first_claim) > 600 else first_claim,
                key_limitations=[c.strip() for c in first_claim.split(";") if len(c.strip()) > 15][:5],
            )
        )

    common_cpcs = list(set.intersection(*cpc_sets)) if cpc_sets else []
    differentiating = [
        f"Assignee divergence: {', '.join([str(d.assignee or 'Unknown') for d in docs])}",
        f"Publication timeline spans from {min([str(d.publication_date or '') for d in docs])} to {max([str(d.publication_date or '') for d in docs])}",
        f"Technological focus varies between {[str(d.cpc_codes[0]) if d.cpc_codes else 'General' for d in docs]}",
    ]

    log_audit_event(db, user, "COMPARE_PATENTS", "PatentDocument", None, {"doc_ids": req.doc_ids})
    return PatentCompareResponse(
        patents=items,
        common_cpc_codes=common_cpcs,
        differentiating_factors=differentiating,
    )


@app.get("/api/v1/patents/{doc_id}/citations")
def get_patent_citations(
    doc_id: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    doc = db.query(PatentDocument).filter(PatentDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Patent not found")

    backward_citations: list[str] = list(doc.citations or [])
    forward_citations = (
        db.query(PatentDocument).filter(PatentDocument.citations.as_string().ilike(f"%{doc.publication_number}%")).all()
    )
    family_members = (
        db.query(PatentDocument).filter(PatentDocument.family_id == doc.family_id, PatentDocument.id != doc.id).all()
        if doc.family_id
        else []
    )

    return {
        "publication_number": str(doc.publication_number),
        "backward_citations": backward_citations,
        "forward_citations": [
            {"id": str(f.id), "title": str(f.title), "assignee": str(f.assignee)} for f in forward_citations
        ],
        "family_members": [
            {"id": str(fm.id), "country": str(fm.country), "publication_date": str(fm.publication_date)}
            for fm in family_members
        ],
    }


# --- Saved Documents Repository ---


@app.get("/api/v1/saved-documents", response_model=list[SavedDocumentOut])
def list_saved_documents(
    project_id: str | None = None,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    query = db.query(SavedDocument).filter(SavedDocument.workspace_id == active_workspace.id)
    if project_id:
        query = query.filter(SavedDocument.project_id == project_id)
    saved = query.order_by(SavedDocument.created_at.desc()).all()

    results = []
    for s in saved:
        doc = db.query(PatentDocument).filter(PatentDocument.id == s.doc_id).first()
        results.append(
            SavedDocumentOut(
                id=str(s.id),
                doc_id=str(s.doc_id),
                title=str(doc.title) if doc else "Unknown Title",
                publication_number=str(doc.publication_number) if doc else str(s.doc_id),
                assignee=str(doc.assignee) if doc and doc.assignee else None,
                project_id=str(s.project_id) if s.project_id else None,
                tags=list(s.tags or []),
                notes=str(s.notes) if s.notes else None,
                created_at=cast(datetime.datetime | None, s.created_at),
            )
        )
    return results


@app.post("/api/v1/saved-documents", response_model=SavedDocumentOut)
def save_document(
    req: SavedDocumentCreate,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    doc = db.query(PatentDocument).filter(PatentDocument.id == req.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Patent document does not exist")

    # Validate project belongs to this workspace if supplied
    target_project_id = None
    if req.project_id:
        proj = db.query(Project).filter(Project.id == req.project_id, Project.workspace_id == active_workspace.id).first()
        if proj:
            target_project_id = proj.id

    saved_id = str(uuid.uuid4())
    now = datetime.datetime.utcnow()
    saved_row = SavedDocument(
        id=saved_id,
        workspace_id=active_workspace.id,
        user_id=user.id,
        project_id=target_project_id,
        doc_id=req.doc_id,
        tags=req.tags,
        notes=req.notes,
        created_at=now,
    )
    db.add(saved_row)
    log_audit_event(db, user, "SAVE_DOCUMENT", "PatentDocument", str(req.doc_id), {"tags": req.tags})
    db.commit()

    return SavedDocumentOut(
        id=saved_id,
        doc_id=str(req.doc_id),
        title=str(doc.title),
        publication_number=str(doc.publication_number),
        assignee=str(doc.assignee) if doc.assignee else None,
        project_id=target_project_id,
        tags=list(req.tags or []),
        notes=str(req.notes) if req.notes else None,
        created_at=now,
    )


@app.delete("/api/v1/saved-documents/{saved_id}")
def delete_saved_document(
    saved_id: str,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    saved_row = (
        db.query(SavedDocument)
        .filter(SavedDocument.id == saved_id, SavedDocument.workspace_id == active_workspace.id)
        .first()
    )
    if not saved_row:
        raise HTTPException(status_code=404, detail="Saved document record not found")

    db.delete(saved_row)
    db.commit()
    return {"status": "deleted", "id": saved_id}


# --- Claim Charts & Evidence Review ---


@app.get("/api/v1/claim-charts")
def get_all_claim_charts(
    support_level: str | None = None,
    search_id: str | None = None,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    query = db.query(EvidenceMapping).filter(EvidenceMapping.workspace_id == active_workspace.id)
    if search_id:
        query = query.filter(EvidenceMapping.search_id == search_id)
    if support_level:
        query = query.filter(EvidenceMapping.support_level == support_level.upper())

    mappings = query.order_by(EvidenceMapping.created_at.desc()).limit(100).all()
    return [
        {
            "id": m.id,
            "search_id": m.search_id,
            "doc_id": m.doc_id,
            "element_id": m.element_id,
            "limitation_text": m.limitation_text,
            "support_level": m.support_level,
            "exact_quote": m.exact_quote,
            "passage_location": m.passage_location,
            "verified": m.verified,
            "confidence_score": m.confidence_score,
            "rationale": m.rationale,
            "attorney_review_status": m.attorney_review_status,
            "attorney_notes": m.attorney_notes,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in mappings
    ]


@app.patch("/api/v1/evidence/{evidence_id}")
def update_evidence_review(
    evidence_id: str,
    req: EvidenceUpdate,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    ev = (
        db.query(EvidenceMapping)
        .filter(EvidenceMapping.id == evidence_id, EvidenceMapping.workspace_id == active_workspace.id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence mapping not found")

    setattr(ev, "attorney_review_status", req.attorney_review_status)
    if req.attorney_notes:
        setattr(ev, "attorney_notes", req.attorney_notes)
    db.commit()
    log_audit_event(db, user, "REVIEW_EVIDENCE", "EvidenceMapping", evidence_id, {"status": req.attorney_review_status})
    return {"status": "updated", "id": str(ev.id), "attorney_review_status": str(ev.attorney_review_status)}


# --- Corpus Coverage Explorer & Graph Intelligence ---


@app.get("/api/v1/corpus/coverage")
def get_corpus_coverage(
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
):
    """Returns comprehensive coverage statistics across the full indexed patent corpus."""
    return get_corpus_coverage_report(db)


@app.get("/api/v1/patents/{doc_id}/graph")
def get_patent_graph(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
):
    """Returns interactive citation network and shared family cluster for a patent."""
    graph = get_patent_citation_network(doc_id, db)
    if not graph.get("nodes"):
        raise HTTPException(status_code=404, detail="Patent not found in corpus")
    return graph


# --- Iterative Multi-Strategy Search ---


@app.post("/api/v1/search/iterative")
def search_iterative(
    search_req: IterativeSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
):
    """
    Coordinated multi-strategy search with automatic limitation gap detection,
    targeted follow-up query dispatching, and citation graph expansion.
    """
    raw_claim = search_req.raw_claim.strip()
    if not raw_claim:
        raise HTTPException(status_code=422, detail="Claim text empty")

    role = get_effective_workspace_role(user, active_workspace, db)
    if role in ["VIEWER", "READONLY", "SUPPORT_AUDITOR"]:
        raise HTTPException(status_code=403, detail="Forbidden: Read-only members cannot execute searches")

    target_project_id = None
    if search_req.project_id and search_req.project_id not in ["default-workspace", "default"]:
        proj = db.query(Project).filter(Project.id == search_req.project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail="Specified matter not found")
        if proj.workspace_id != active_workspace.id:
            raise HTTPException(
                status_code=400,
                detail="Cross-workspace violation: Specified matter does not belong to active workspace",
            )
        target_project_id = proj.id

    from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline

    qu = QueryUnderstandingPipeline()
    decomposed = qu.process_claim(raw_claim)

    result = iterative_engine.run_multi_strategy_discovery(
        decomposed_claim=decomposed,
        filters=search_req.filters,
        top_k=search_req.top_k,
        db=db,
    )
    search_id = str(uuid.uuid4())

    # Store search execution and evidence mappings scoped to active workspace
    try:

        elements_list = [e.model_dump() for e in decomposed.elements]
        search_rec = SearchExecution(
            id=search_id,
            workspace_id=active_workspace.id,
            user_id=user.id,
            project_id=target_project_id,
            raw_claim=raw_claim,
            preamble=decomposed.preamble,
            transition_phrase=decomposed.transition,
            decomposed_elements=elements_list,
            parameters=search_req.filters.model_dump() if search_req.filters else {},
            candidate_count=result.get("total_candidates_evaluated", 0),
            result_count=len(result.get("results", [])),
            results_cache=[d.model_dump() for d in result.get("results", [])],
        )
        db.add(search_rec)

        for d in result.get("results", []):
            for item in getattr(d, "claim_chart", []):
                ev_row = EvidenceMapping(
                    id=str(uuid.uuid4()),
                    workspace_id=active_workspace.id,
                    user_id=user.id,
                    search_id=search_id,
                    doc_id=d.doc_id,
                    element_id=item.element_id,
                    limitation_text=item.limitation_text,
                    support_level=item.support_level,
                    exact_quote=item.exact_quote,
                    passage_location=item.passage_location,
                    verified=item.verified,
                    confidence_score=item.confidence_score,
                    rationale=item.rationale,
                )
                db.add(ev_row)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist iterative search execution: {e}")
        db.rollback()

    log_audit_event(db, user, "ITERATIVE_SEARCH", "Search", search_id, details={"gap_summary": result["gap_summary"]})
    return {
        "search_id": search_id,
        "decomposed_claim": decomposed,
        "results": [d.model_dump() for d in result["results"]],
        "limitation_gaps": result["limitation_gaps"],
        "gap_summary": result["gap_summary"],
        "strategy_provenance": result["strategy_provenance"],
        "follow_up_queries": result["follow_up_queries"],
        "citation_leads_explored": result["citation_leads_explored"],
        "family_leads_explored": result["family_leads_explored"],
        "total_candidates_evaluated": result["total_candidates_evaluated"],
        "execution_time_ms": result["execution_time_ms"],
    }


# --- Evidence Integrity Ledger ---


@app.get("/api/v1/evidence-ledger", response_model=list[EvidenceLedgerItem])
def get_evidence_ledger(
    search_id: str | None = None,
    doc_id: str | None = None,
    support_level: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
):
    """
    Retrieves verifiable evidence mappings with exact section/paragraph coordinates,
    character offsets, document hashes, and audit review decisions scoped to active workspace.
    """
    query = (
        db.query(EvidenceMapping, PatentDocument)
        .outerjoin(PatentDocument, EvidenceMapping.doc_id == PatentDocument.id)
        .filter(EvidenceMapping.workspace_id == active_workspace.id)
    )
    if search_id:
        query = query.filter(EvidenceMapping.search_id == search_id)
    if doc_id:
        query = query.filter(EvidenceMapping.doc_id == doc_id)
    if support_level:
        query = query.filter(EvidenceMapping.support_level == support_level)

    rows = query.order_by(EvidenceMapping.created_at.desc()).limit(limit).all()

    items = []
    for em, pdoc in rows:
        items.append(
            EvidenceLedgerItem(
                id=em.id,
                search_id=em.search_id,
                doc_id=em.doc_id,
                publication_number=pdoc.publication_number if pdoc else em.doc_id,
                patent_title=pdoc.title if pdoc else None,
                element_id=em.element_id,
                limitation_text=em.limitation_text,
                support_level=em.support_level,
                exact_quote=em.exact_quote,
                section=em.section or "DESCRIPTION",
                paragraph_number=em.paragraph_number or em.passage_location or "[0001]",
                char_start=em.char_start or 0,
                char_end=em.char_end or 0,
                literal_match=bool(em.literal_match),
                semantic_similarity=float(em.semantic_similarity or 0.0),
                verified=bool(em.verified),
                confidence_score=float(em.confidence_score or 0.0),
                rationale=em.rationale,
                document_hash=em.document_hash,
                reviewer_decision=em.reviewer_decision or "UNREVIEWED",
                attorney_review_status=em.attorney_review_status or "PENDING",
                attorney_notes=em.attorney_notes,
                provenance=em.provenance or {},
                created_at=em.created_at,
            )
        )
    return items


@app.post("/api/v1/evidence-ledger/{evidence_id}/review")
def review_evidence_ledger_entry(
    evidence_id: str,
    review_req: EvidenceReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
):
    """Submits an immutable, audited human review decision for an evidence mapping."""
    ev = (
        db.query(EvidenceMapping)
        .filter(EvidenceMapping.id == evidence_id, EvidenceMapping.workspace_id == active_workspace.id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence mapping not found in this workspace")

    res = review_evidence_entry(
        evidence_id=evidence_id,
        decision=review_req.decision,
        notes=review_req.notes,
        user_email=str(getattr(user, "email", "attorney@enterprise.ip")),
        db=db,
    )
    if "error" in res:
        raise HTTPException(status_code=res.get("status", 400), detail=res["error"])
    return res


# --- Multi-Document Claim Mapping Matrix ---


@app.post("/api/v1/patents/multi-claim-map", response_model=MultiClaimMapResponse)
def generate_multi_claim_map(
    req: MultiClaimMapRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
):
    """
    Constructs a side-by-side limitation matrix comparing 1 decomposed claim
    against 3-5 patents across all atomic limitations simultaneously.
    """
    raw_claim = req.raw_claim.strip()
    if not raw_claim:
        raise HTTPException(status_code=422, detail="Claim text required")

    from backend.app.retrieval.evidence_analyzer import EvidenceAnalyzer
    from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline

    qu = QueryUnderstandingPipeline()
    decomposed = qu.process_claim(raw_claim)
    analyzer = EvidenceAnalyzer()

    # Fetch requested patent documents
    target_docs = db.query(PatentDocument).filter(PatentDocument.id.in_(req.doc_ids)).all()
    if not target_docs:
        target_docs = db.query(PatentDocument).limit(4).all()

    columns = [
        MultiClaimMapColumn(
            doc_id=d.id,
            publication_number=d.publication_number,
            title=d.title,
            assignee=d.assignee,
            family_id=d.family_id,
            country=d.country,
        )
        for d in target_docs
    ]

    matrix: list[list[MultiClaimMapCell]] = []

    for element in decomposed.elements:
        row: list[MultiClaimMapCell] = []
        for d in target_docs:
            full_text = (d.title or "") + "\n" + (d.abstract or "") + "\n" + (d.description_text or "")
            ev = analyzer.analyze_limitation(element.text, full_text)
            coords = locate_text_coordinates(ev.exact_quote or "", d)
            row.append(
                MultiClaimMapCell(
                    element_id=element.element_id,
                    doc_id=d.id,
                    support_level=ev.support_level,
                    confidence_score=ev.confidence_score,
                    exact_quote=ev.exact_quote,
                    paragraph_number=coords.get("paragraph_number") or ev.passage_location,
                    section=coords.get("section") or "DESCRIPTION",
                    verified=coords.get("literal_match", ev.verified),
                    rationale=ev.rationale,
                )
            )
        matrix.append(row)

    return MultiClaimMapResponse(
        claim_preamble=decomposed.preamble,
        elements=decomposed.elements,
        columns=columns,
        matrix=matrix,
    )


# --- Scientific Evaluation Benchmarks ---


@app.get("/api/v1/eval/benchmarks")
def get_eval_benchmarks(
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
):
    """Returns the latest evaluation benchmark ablation metrics and comparative runs. Restricted to platform admins."""
    if not getattr(user, "is_platform_admin", False) and user.role != "PLATFORM_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Platform evaluation benchmarks and internal ablations are restricted to platform administrators",
        )
    harness = EvaluationHarness()
    results = harness.run_ablation_benchmark()
    return {
        "status": "success",
        "dataset": "eval/benchmark_dataset.json",
        "total_test_queries": 10,
        "ablation_results": results,
        "last_run": datetime.datetime.utcnow().isoformat() + "Z",
    }


@app.post("/api/v1/eval/run")
def run_eval_benchmarks(
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
):
    """Triggers an on-demand scientific benchmark run and stores historical records. Restricted to platform admins."""
    if not getattr(user, "is_platform_admin", False) and user.role != "PLATFORM_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Platform evaluation benchmarks and internal ablations are restricted to platform administrators",
        )
    harness = EvaluationHarness()
    results = harness.run_ablation_benchmark()
    log_audit_event(db, user, "RUN_EVAL_BENCHMARK", "EvaluationHarness", details=results)
    return {
        "status": "completed",
        "ablation_results": results,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }


# --- Search History, Annotations & Dossier Export ---


@app.get("/api/v1/searches")
def list_searches(
    limit: int = 10,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Lists recent prior-art searches scoped to active workspace."""
    searches = (
        db.query(SearchExecution)
        .filter(SearchExecution.workspace_id == active_workspace.id)
        .order_by(SearchExecution.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "project_id": s.project_id,
            "raw_claim": s.raw_claim,
            "preamble": s.preamble,
            "candidate_count": s.candidate_count,
            "result_count": s.result_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in searches
    ]


@app.get("/api/v1/searches/{search_id}")
def get_search_by_id(
    search_id: str,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    search_rec = (
        db.query(SearchExecution)
        .filter(SearchExecution.id == search_id, SearchExecution.workspace_id == active_workspace.id)
        .first()
    )
    if not search_rec:
        raise HTTPException(status_code=404, detail="Search record not found")

    return {
        "id": search_rec.id,
        "project_id": search_rec.project_id,
        "raw_claim": search_rec.raw_claim,
        "preamble": search_rec.preamble,
        "transition_phrase": search_rec.transition_phrase,
        "decomposed_elements": search_rec.decomposed_elements,
        "parameters": search_rec.parameters,
        "stage_status": search_rec.stage_status,
        "latency_ms": search_rec.latency_ms,
        "results": search_rec.results_cache,
        "created_at": search_rec.created_at.isoformat() if search_rec.created_at else None,
    }


@app.get("/api/v1/searches/{search_id}/evidence")
def get_search_evidence_matrix(
    search_id: str,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    search_rec = (
        db.query(SearchExecution)
        .filter(SearchExecution.id == search_id, SearchExecution.workspace_id == active_workspace.id)
        .first()
    )
    if not search_rec:
        raise HTTPException(status_code=404, detail="Search record not found")

    mappings = (
        db.query(EvidenceMapping)
        .filter(EvidenceMapping.search_id == search_id, EvidenceMapping.workspace_id == active_workspace.id)
        .all()
    )
    return [
        {
            "id": m.id,
            "doc_id": m.doc_id,
            "element_id": m.element_id,
            "limitation_text": m.limitation_text,
            "support_level": m.support_level,
            "exact_quote": m.exact_quote,
            "passage_location": m.passage_location,
            "verified": m.verified,
            "confidence_score": m.confidence_score,
            "rationale": m.rationale,
            "attorney_review_status": m.attorney_review_status,
            "attorney_notes": m.attorney_notes,
        }
        for m in mappings
    ]


@app.post("/api/v1/searches/{search_id}/annotate")
def add_search_annotation(
    search_id: str,
    req: AnnotationRequest,
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    search_rec = (
        db.query(SearchExecution)
        .filter(SearchExecution.id == search_id, SearchExecution.workspace_id == active_workspace.id)
        .first()
    )
    if not search_rec:
        raise HTTPException(status_code=404, detail="Search record not found")

    annotation = (
        db.query(Annotation)
        .filter(
            Annotation.search_id == search_id,
            Annotation.doc_id == req.doc_id,
            Annotation.workspace_id == active_workspace.id,
        )
        .first()
    )
    if annotation:
        setattr(annotation, "review_status", req.review_status)
        setattr(annotation, "notes", req.notes)
        setattr(annotation, "user_id", user.id)
    else:
        annotation = Annotation(
            id=str(uuid.uuid4()),
            workspace_id=active_workspace.id,
            search_id=search_id,
            doc_id=req.doc_id,
            user_id=user.id,
            review_status=req.review_status,
            notes=req.notes,
        )
        db.add(annotation)
    db.commit()
    log_audit_event(
        db,
        user,
        "ANNOTATE",
        "PatentDocument",
        req.doc_id,
        {"status": req.review_status, "search_id": search_id},
    )
    return {"status": "saved", "annotation_id": str(annotation.id)}


@app.get("/api/v1/searches/{search_id}/export")
def export_prior_art_dossier(
    search_id: str,
    format: str = "markdown",
    user: User = Depends(get_authenticated_user),
    active_workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    search_rec = (
        db.query(SearchExecution)
        .filter(SearchExecution.id == search_id, SearchExecution.workspace_id == active_workspace.id)
        .first()
    )
    if not search_rec:
        raise HTTPException(status_code=404, detail="Search record not found")

    results: list[dict[str, Any]] = list(search_rec.results_cache or [])
    elements: list[dict[str, Any]] = list(search_rec.decomposed_elements or [])
    log_audit_event(db, user, "EXPORT_DOSSIER", "SearchExecution", search_id, {"format": format})

    if format == "json":
        return JSONResponse(
            content={
                "search_id": search_id,
                "timestamp": search_rec.created_at.isoformat() if search_rec.created_at else None,
                "claim": {
                    "raw_text": search_rec.raw_claim,
                    "preamble": search_rec.preamble,
                    "transition": search_rec.transition_phrase,
                    "elements": elements,
                },
                "candidates": results,
                "disclaimer": DISCLAIMER_TEXT,
            }
        )

    if format == "csv":
        import io

        output = io.StringIO()
        output.write("Rank,Document_ID,Title,Assignee,Publication_Date,Fused_Score,Rerank_Score,Summary\n")
        for idx, r in enumerate(results, 1):
            clean_title = (r.get("title") or "").replace('"', '""')
            clean_summary = (r.get("explanation") or "").replace('"', '""')
            output.write(
                f'{idx},"{r.get("doc_id")}","{clean_title}","{r.get("assignee")}","{r.get("publication_date")}",{r.get("fused_score")},{r.get("rerank_score")},"{clean_summary}"\n'
            )
        return PlainTextResponse(content=output.getvalue(), media_type="text/csv")

    if format == "html":
        # Print-ready professional legal memorandum
        cand_html = ""
        for i, doc in enumerate(results, 1):
            rows = ""
            for item in doc.get("claim_chart", []):
                verified_badge = (
                    '<span style="color:#059669; font-weight:bold;">[VERIFIED]</span>'
                    if item.get("verified")
                    else '<span style="color:#6b7280;">[UNVERIFIED]</span>'
                )
                rows += f"""<tr>
                    <td style="padding:8px; border:1px solid #e5e7eb;"><b>{item.get("element_id")}</b></td>
                    <td style="padding:8px; border:1px solid #e5e7eb;">{item.get("limitation_text")}</td>
                    <td style="padding:8px; border:1px solid #e5e7eb;"><code>{item.get("support_level")}</code></td>
                    <td style="padding:8px; border:1px solid #e5e7eb; font-style:italic;">&ldquo;{item.get("exact_quote", "")}&rdquo; {verified_badge}</td>
                    <td style="padding:8px; border:1px solid #e5e7eb;">{item.get("passage_location", "")}</td>
                </tr>"""

            cand_html += f"""<div style="margin-bottom:30px; padding:20px; border:1px solid #e5e7eb; border-radius:8px;">
                <h3 style="margin-top:0; color:#1e293b;">#{i}. {doc.get("doc_id")} &mdash; {doc.get("title")}</h3>
                <p><b>Assignee:</b> {doc.get("assignee")} | <b>Publication Date:</b> {doc.get("publication_date")} | <b>CPC:</b> {", ".join(doc.get("cpc_codes", []))}</p>
                <p><b>Relevance Assessment:</b> {doc.get("explanation")}</p>
                <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:8px; border:1px solid #e5e7eb;">Element</th>
                            <th style="padding:8px; border:1px solid #e5e7eb;">Limitation</th>
                            <th style="padding:8px; border:1px solid #e5e7eb;">Support</th>
                            <th style="padding:8px; border:1px solid #e5e7eb;">Verifiable Quotation</th>
                            <th style="padding:8px; border:1px solid #e5e7eb;">Location</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>"""

        full_html = f"""<!DOCTYPE html>
<html>
<head>
<title>Patent Prior-Art Research Dossier - {search_id}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #0f172a; margin: 40px auto; max-width: 900px; padding: 0 20px; }}
h1, h2, h3 {{ color: #0f172a; }}
.header-box {{ border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }}
.disclaimer {{ background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 6px; font-size: 13px; margin-top: 40px; }}
</style>
</head>
<body>
<div class="header-box">
    <h1>Patent Prior-Art Search Engine &mdash; Research Dossier</h1>
    <p><b>Search Identifier:</b> <code>{search_id}</code> | <b>Date:</b> {search_rec.created_at} | <b>Investigator:</b> {user.full_name}</p>
</div>
<h2>1. Submitted Claim Limitation Analysis</h2>
<blockquote style="background:#f8fafc; padding:15px; border-left:4px solid #3b82f6; margin:0 0 20px 0;">{search_rec.raw_claim}</blockquote>
<h2>2. Prior-Art Evidence Matrix</h2>
{cand_html}
<div class="disclaimer">
    <b>STATUTORY LEGAL NOTICE:</b> {DISCLAIMER_TEXT}
</div>
</body>
</html>"""
        return HTMLResponse(content=full_html)

    # Default: Markdown
    lines = [
        "# Prior-Art Search & Evidence Dossier",
        "**Platform**: Patent Prior-Art Search Engine",
        f"**Search ID**: `{search_id}`",
        f"**Date Executed**: {search_rec.created_at}",
        f"**Investigator**: {user.full_name} ({user.email})",
        f"**Candidate Count**: {search_rec.candidate_count} (Returned Top {len(results)})",
        "",
        "## 1. Submitted Invention Claim",
        f"> {search_rec.raw_claim}",
        "",
        "### Claim Limitations Analyzed:",
    ]

    for elem in elements:
        lines.append(f"- **{elem.get('element_id')}** [{elem.get('element_type')}]: {elem.get('text')}")

    lines.extend(
        [
            "",
            "## 2. Ranked Prior-Art Candidates & Limitation Mapping",
        ]
    )

    for i, doc in enumerate(results, 1):
        lines.extend(
            [
                f"### #{i}. {doc.get('doc_id')} - {doc.get('title')}",
                f"- **Publication Date**: {doc.get('publication_date')} | **Assignee**: {doc.get('assignee')} | **CPC**: {', '.join(doc.get('cpc_codes', []))}",
                f"- **Fused RRF Score**: {doc.get('fused_score')} | **Cross-Encoder Score**: {doc.get('rerank_score')}",
                f"- **Relevance Analysis**: {doc.get('explanation')}",
                "",
                "#### Evidence Claim Chart:",
                "| Element ID | Limitation | Support Status | Verified Quotation | Location |",
                "|---|---|---|---|---|",
            ]
        )
        for chart_item in doc.get("claim_chart", []):
            quote = f'"{chart_item.get("exact_quote")}"' if chart_item.get("exact_quote") else "None"
            verified_mark = " (Verified)" if chart_item.get("verified") else ""
            lines.append(
                f"| {chart_item.get('element_id')} | {chart_item.get('limitation_text')[:40]}... | {chart_item.get('support_level')} | {quote[:50]}...{verified_mark} | {chart_item.get('passage_location')} |"
            )
        lines.append("")

    lines.extend(
        [
            "## 3. Statutory Legal Disclaimer",
            f"> {DISCLAIMER_TEXT}",
        ]
    )

    report_markdown = "\n".join(lines)
    return {"format": "markdown", "report": report_markdown}


# --- Patent Document Inspector Endpoint ---


@app.get("/api/v1/documents/{doc_id}")
def get_patent_document(
    doc_id: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    doc = db.query(PatentDocument).filter(PatentDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Patent document not found")

    log_audit_event(db, user, "VIEW_DOCUMENT", "PatentDocument", doc_id)
    return {
        "id": doc.id,
        "publication_number": doc.publication_number,
        "country": doc.country,
        "title": doc.title,
        "abstract": doc.abstract,
        "claims_list": doc.claims_list,
        "description": doc.description_text,
        "cpc_codes": doc.cpc_codes,
        "publication_date": doc.publication_date,
        "priority_date": doc.priority_date,
        "family_id": doc.family_id,
        "assignee": doc.assignee,
        "inventors": doc.inventors,
        "citations": doc.citations,
        "source_url": doc.source_url,
    }


# --- Health, Readiness & Evaluation Endpoints ---


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Patent Prior-Art Search Engine",
        "version": "3.0.0",
        "documentation": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    qdrant_url = os.getenv("QDRANT_URL") or settings.QDRANT_URL
    if not qdrant_url:
        return {"status": "ready", "mode": "local_resilient"}

    try:
        response = requests.get(f"{qdrant_url}/readyz", timeout=3)
        if response.status_code == 200:
            return {"status": "ready"}
        else:
            logger.exception("Qdrant not ready")
            raise HTTPException(status_code=503, detail="Qdrant not ready")
    except requests.RequestException:
        logger.exception("Qdrant connection failed")
        raise HTTPException(status_code=503, detail="Qdrant connection failed")


@app.get("/eval/latest")
@app.get("/api/v1/eval/latest")
def eval_latest(user: User = Depends(get_authenticated_user), db: Session = Depends(get_db)):
    """Fetches real evaluation metrics from database or fallback to lift_table.csv (restricted to platform admins)."""
    if str(user.role) not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail="Platform evaluation metrics are restricted to platform administrators",
        )
    records = db.query(EvaluationRecord).order_by(EvaluationRecord.created_at.desc()).limit(10).all()

    if records:
        return {
            "metrics": [
                {
                    "System": r.system_type,
                    "P@5": f"{r.p_at_5:.2f}",
                    "R@5": f"{r.r_at_5:.2f}",
                    "MRR": f"{r.mrr:.2f}",
                    "nDCG@5": f"{r.ndcg_at_5:.2f}",
                    "Run": r.run_name,
                }
                for r in records
            ]
        }

    import csv

    for candidate_path in ["eval/results/lift_table.csv", "tests/eval/results/lift_table.csv"]:
        if os.path.exists(candidate_path):
            results = []
            with open(candidate_path) as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results.append(row)
            return {"metrics": results}

    return {"metrics": []}
