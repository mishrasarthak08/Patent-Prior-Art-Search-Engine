import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db.models import (
    AuditLog,
    Organization,
    SupportSession,
    User,
    Workspace,
    WorkspaceMembership,
)
from backend.app.db.session import get_db

settings = get_settings()
security_bearer = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

JWT_SECRET_KEY = getattr(settings, "JWT_SECRET_KEY", "patent-engine-enterprise-secret-key-38491823901")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def get_password_hash(password: str) -> str:
    salt = "patent_engine_salt_2026_"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if get_password_hash(plain_password) == hashed_password:
        return True
    old_salt = "veritas_salt_secure_2026_"
    return hashlib.sha256(f"{old_salt}{plain_password}".encode()).hexdigest() == hashed_password


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return str(encoded_jwt)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def get_current_user_flexible(
    bearer: HTTPAuthorizationCredentials | None = Security(security_bearer),
    api_key: str | None = Security(api_key_header),
    db: Session = Depends(get_db),
) -> User:
    """Enforces authentication: accepts either Bearer JWT token or X-API-Key."""
    # 1. Check API Key header
    if api_key and api_key == settings.API_KEY:
        admin = (
            db.query(User).filter(User.email == "admin@patentsearchengine.com").first()
            or db.query(User).filter(User.email == "admin@veritas-ip.com").first()
            or db.query(User).first()
        )
        if admin:
            return admin
        return User(
            id="user-admin-engine",
            email="admin@patentsearchengine.com",
            full_name="Sarah Jenkins, Esq.",
            role="OWNER",
        )

    # 2. Check Bearer token (JWT or API Key passed as Bearer)
    if bearer and bearer.credentials:
        token = bearer.credentials
        if token == settings.API_KEY or token == settings.API_AUTH_TOKEN:
            admin = (
                db.query(User).filter(User.email == "admin@patentsearchengine.com").first()
                or db.query(User).filter(User.email == "admin@veritas-ip.com").first()
                or db.query(User).first()
            )
            if admin:
                return admin
            return User(
                id="user-admin-engine",
                email="admin@patentsearchengine.com",
                full_name="Sarah Jenkins, Esq.",
                role="OWNER",
            )

        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.email == str(payload["sub"])).first()
            if user:
                return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )


def check_active_support_session(admin_user: User, workspace_id: str, db: Session) -> SupportSession | None:
    """
    Checks if an internal platform administrator has an active, time-limited, logged support session.
    Support access grants temporary read-only troubleshooting authority and is audited on every action.
    """
    if not getattr(admin_user, "is_platform_admin", False) and admin_user.role != "PLATFORM_ADMIN":
        return None
    now = datetime.utcnow()
    session = (
        db.query(SupportSession)
        .filter(
            SupportSession.admin_user_id == admin_user.id,
            SupportSession.workspace_id == workspace_id,
            SupportSession.is_active.is_(True),
            SupportSession.expires_at > now,
        )
        .first()
    )
    return session


def get_effective_workspace_role(user: User, workspace: Workspace, db: Session) -> str:
    """
    Resolves the user's effective Role-Based Access Control (RBAC) role in the target workspace.
    Enforces deny-by-default:
    - 'PERSONAL_OWNER': User owns this personal workspace
    - 'OWNER': Organization workspace owner
    - 'ADMIN': Organization workspace administrator
    - 'ATTORNEY' / 'RESEARCHER': Technical patent researcher
    - 'REVIEWER': Legal/technical evidence reviewer
    - 'VIEWER': Read-only workspace member
    - 'SUPPORT_AUDITOR': Internal platform administrator in an active, logged support session
    - 'DENIED': No authorized access
    """
    # 1. Personal Workspace: Strictly private to creator
    if workspace.workspace_type == "PERSONAL":
        if workspace.owner_user_id == user.id:
            return "PERSONAL_OWNER"
        if check_active_support_session(user, workspace.id, db):
            return "SUPPORT_AUDITOR"
        return "DENIED"

    # 2. Organization Workspace: Check verified WorkspaceMembership
    membership = (
        db.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace.id,
            WorkspaceMembership.user_id == user.id,
        )
        .first()
    )
    if membership:
        return membership.role.upper()

    # 3. Organization Owner/Admin fallback: ONLY if user is verified OWNER/ADMIN of that exact organization
    if workspace.org_id and user.org_id == workspace.org_id:
        org_admin_membership = (
            db.query(WorkspaceMembership)
            .join(Workspace, WorkspaceMembership.workspace_id == Workspace.id)
            .filter(
                Workspace.org_id == workspace.org_id,
                WorkspaceMembership.user_id == user.id,
                WorkspaceMembership.role.in_(["OWNER", "ADMIN"]),
            )
            .first()
        )
        if org_admin_membership:
            return org_admin_membership.role.upper()

    # 4. Check active platform administrator support session
    if check_active_support_session(user, workspace.id, db):
        return "SUPPORT_AUDITOR"

    return "DENIED"


def set_database_tenant_context(db: Session, workspace_id: str, is_admin: bool = False):
    """Binds tenant workspace context to the PostgreSQL session for kernel Row-Level Security."""
    try:
        bind = db.get_bind()
        if bind and bind.dialect.name == "postgresql":
            from sqlalchemy import text
            admin_str = "true" if is_admin else "false"
            db.execute(text("SELECT set_config('app.current_workspace_id', :ws_id, false);"), {"ws_id": workspace_id})
            db.execute(text("SELECT set_config('app.is_platform_admin', :is_admin, false);"), {"is_admin": admin_str})
    except Exception:
        pass


def get_active_workspace(
    x_workspace_id: str | None = Header(None, alias="X-Workspace-Id"),
    user: User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db),
) -> Workspace:
    """
    Enforces multi-tenant workspace isolation with strict deny-by-default authorization.
    Resolves the requested workspace and verifies that the calling user has verified access.
    
    Security Guarantees:
    - Explicitly invalid workspace IDs return HTTP 404 immediately (NEVER silent fallback).
    - Unauthorized workspace IDs return HTTP 403 Forbidden.
    - Global user roles never grant arbitrary organization access.
    - Personal workspaces remain strictly private.
    """
    is_admin = getattr(user, "is_platform_admin", False)
    resolved_ws = None

    if x_workspace_id:
        target_id = x_workspace_id.strip()
        ws = db.query(Workspace).filter(Workspace.id == target_id).first()
        if not ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace '{target_id}' not found",
            )

        role = get_effective_workspace_role(user, ws, db)
        if role == "DENIED":
            if ws.workspace_type == "PERSONAL":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Cannot access another user's personal research workspace",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have verified membership or authorized role in this organization workspace",
            )
        resolved_ws = ws

    # Fallback ONLY when header is omitted: use user's default workspace if authorized
    elif user.default_workspace_id:
        def_ws = db.query(Workspace).filter(Workspace.id == user.default_workspace_id).first()
        if def_ws:
            role = get_effective_workspace_role(user, def_ws, db)
            if role != "DENIED":
                resolved_ws = def_ws

    # Look for personal workspace owned by this user
    if not resolved_ws:
        personal_ws = (
            db.query(Workspace)
            .filter(Workspace.owner_user_id == user.id, Workspace.workspace_type == "PERSONAL")
            .first()
        )
        if personal_ws:
            resolved_ws = personal_ws

    # Look for any organization workspace the user is a verified member of
    if not resolved_ws:
        user_ws = (
            db.query(Workspace)
            .join(WorkspaceMembership, Workspace.id == WorkspaceMembership.workspace_id)
            .filter(WorkspaceMembership.user_id == user.id)
            .first()
        )
        if user_ws:
            resolved_ws = user_ws

    # Create a brand new personal workspace on the fly if none exists
    if not resolved_ws:
        new_personal_id = f"ws-personal-{user.id[:8]}"
        new_ws = Workspace(
            id=new_personal_id,
            org_id=user.org_id,
            name=f"{user.full_name}'s Research Workspace",
            description="Private personal patent research workbench.",
            workspace_type="PERSONAL",
            owner_user_id=user.id,
            is_default=True,
        )
        db.add(new_ws)
        db.commit()

        mem = WorkspaceMembership(
            id=str(uuid.uuid4()),
            workspace_id=new_ws.id,
            user_id=user.id,
            role="OWNER",
        )
        db.add(mem)
        user.default_workspace_id = new_ws.id
        db.commit()
        db.refresh(new_ws)
        resolved_ws = new_ws

    set_database_tenant_context(db, resolved_ws.id, is_admin)
    return resolved_ws


def require_workspace_permission(min_level: str):
    """
    Enforces minimum RBAC rank for protected mutations.
    Hierarchy:
      VIEWER / READONLY (1)
      SUPPORT_AUDITOR (1, strictly read-only)
      REVIEWER (2)
      RESEARCHER / ATTORNEY (3)
      ADMIN (4)
      OWNER / PERSONAL_OWNER (5)
    """
    levels = {
        "VIEWER": 1,
        "READONLY": 1,
        "SUPPORT_AUDITOR": 1,
        "REVIEWER": 2,
        "RESEARCHER": 3,
        "ATTORNEY": 3,
        "ADMIN": 4,
        "OWNER": 5,
        "PERSONAL_OWNER": 5,
    }
    min_rank = levels.get(min_level.upper(), 1)

    def dependency(
        ws: Workspace = Depends(get_active_workspace),
        user: User = Depends(get_current_user_flexible),
        db: Session = Depends(get_db),
    ) -> tuple[Workspace, str]:
        role = get_effective_workspace_role(user, ws, db)
        user_rank = levels.get(role, 0)
        if user_rank < min_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Requires '{min_level}' role in this workspace (current effective role: '{role}').",
            )
        return ws, role

    return dependency


def require_platform_admin(
    user: User = Depends(get_current_user_flexible),
) -> User:
    """Enforces strict platform administrator privilege, separate from customer organization roles."""
    if not getattr(user, "is_platform_admin", False) and user.role != "PLATFORM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrator privileges required to access internal diagnostics or support operations.",
        )
    return user


def create_support_session(
    admin: User,
    workspace: Workspace,
    ticket_reference: str,
    reason: str,
    duration_minutes: int,
    db: Session,
    ip_address: str = "127.0.0.1",
) -> SupportSession:
    """Initiates a time-limited, logged support session for a platform administrator."""
    if not getattr(admin, "is_platform_admin", False) and admin.role != "PLATFORM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can initiate support sessions",
        )
    
    duration = min(max(duration_minutes, 5), 120)  # Between 5 mins and 2 hours
    expires_at = datetime.utcnow() + timedelta(minutes=duration)

    session = SupportSession(
        id=str(uuid.uuid4()),
        admin_user_id=admin.id,
        workspace_id=workspace.id,
        ticket_reference=ticket_reference.strip(),
        reason=reason.strip(),
        is_active=True,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
    )
    db.add(session)

    # Log to non-repudiation audit trail
    audit = AuditLog(
        id=str(uuid.uuid4()),
        org_id=workspace.org_id,
        user_id=admin.id,
        user_email=admin.email,
        action="SUPPORT_SESSION_START",
        resource_type="workspace",
        resource_id=workspace.id,
        details={
            "session_id": session.id,
            "ticket": ticket_reference,
            "reason": reason,
            "duration_minutes": duration,
            "expires_at": expires_at.isoformat() + "Z",
        },
        ip_address=ip_address,
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(session)
    return session


def terminate_support_session(
    session_id: str,
    admin: User,
    db: Session,
    ip_address: str = "127.0.0.1",
) -> SupportSession:
    """Terminates an active support session immediately and logs termination."""
    session = db.query(SupportSession).filter(SupportSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Support session not found")
    
    if session.admin_user_id != admin.id and not getattr(admin, "is_platform_admin", False):
        raise HTTPException(status_code=403, detail="Cannot terminate another administrator's support session")

    session.is_active = False
    session.revoked_at = datetime.utcnow()

    audit = AuditLog(
        id=str(uuid.uuid4()),
        org_id=session.workspace.org_id if session.workspace else None,
        user_id=admin.id,
        user_email=admin.email,
        action="SUPPORT_SESSION_TERMINATE",
        resource_type="workspace",
        resource_id=session.workspace_id,
        details={
            "session_id": session.id,
            "revoked_at": session.revoked_at.isoformat() + "Z",
            "actions_performed": session.actions_performed_count,
        },
        ip_address=ip_address,
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(session)
    return session


def ensure_seed_users_and_orgs(db: Session) -> None:
    """Ensure standard default organization, workspaces, and users exist with proper isolation."""
    org = (
        db.query(Organization).filter(Organization.id == "org-patent-primary").first()
        or db.query(Organization).filter(Organization.slug == "patent-intelligence").first()
        or db.query(Organization).first()
    )
    if not org:
        org = Organization(
            id="org-patent-primary",
            name="Patent Intelligence Practice Group",
            slug="patent-intelligence",
            plan="ENTERPRISE",
            max_seats=25,
        )
        db.add(org)
        db.commit()
        db.refresh(org)

    # Workspaces
    ws1 = db.query(Workspace).filter(Workspace.id == "ws-energy-semi").first()
    if not ws1:
        ws1 = Workspace(
            id="ws-energy-semi",
            org_id=org.id,
            name="Energy & Solid-State Systems",
            description="Prior-art search on solid-state battery chemistry and silicon anode composites.",
            is_default=True,
            workspace_type="ORGANIZATION",
        )
        db.add(ws1)

    ws2 = db.query(Workspace).filter(Workspace.id == "ws-ai-neuromorphic").first()
    if not ws2:
        ws2 = Workspace(
            id="ws-ai-neuromorphic",
            org_id=org.id,
            name="Neuromorphic & Transformer Architectures",
            description="Edge inference acceleration, crossbar arrays, and attention transformers.",
            is_default=False,
            workspace_type="ORGANIZATION",
        )
        db.add(ws2)
    db.commit()

    # Admin user
    admin_user = db.query(User).filter(User.email == "admin@patentsearchengine.com").first()
    if not admin_user:
        admin_user = User(
            id="user-admin-engine",
            org_id=org.id,
            email="admin@patentsearchengine.com",
            full_name="Sarah Jenkins, Esq.",
            hashed_password=get_password_hash("patent2026"),
            role="OWNER",
            is_platform_admin=True,
            default_workspace_id="ws-energy-semi",
            onboarding_completed=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    else:
        admin_user.is_platform_admin = True
        db.commit()

    # Legacy admin for backward compatibility
    legacy_admin = db.query(User).filter(User.email == "admin@veritas-ip.com").first()
    if not legacy_admin:
        legacy_admin = User(
            id="user-admin-legacy",
            org_id=org.id,
            email="admin@veritas-ip.com",
            full_name="Sarah Jenkins, Esq.",
            hashed_password=get_password_hash("veritas2026"),
            role="OWNER",
            is_platform_admin=True,
            default_workspace_id="ws-energy-semi",
            onboarding_completed=True,
        )
        db.add(legacy_admin)
        db.commit()
    else:
        legacy_admin.is_platform_admin = True
        db.commit()

    # Ensure admin membership in ws-energy-semi
    for u in [admin_user, legacy_admin]:
        if u:
            m = db.query(WorkspaceMembership).filter(
                WorkspaceMembership.workspace_id == "ws-energy-semi",
                WorkspaceMembership.user_id == u.id
            ).first()
            if not m:
                db.add(WorkspaceMembership(
                    id=str(uuid.uuid4()),
                    workspace_id="ws-energy-semi",
                    user_id=u.id,
                    role="OWNER"
                ))
    db.commit()
