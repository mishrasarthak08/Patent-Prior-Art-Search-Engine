import datetime
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    plan = Column(String(50), default="PROFESSIONAL")  # STARTER, PROFESSIONAL, ENTERPRISE
    max_seats = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="organization", cascade="all, delete-orphan")
    matters = relationship("Project", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="ATTORNEY")  # OWNER, ADMIN, ATTORNEY, RESEARCHER, REVIEWER, VIEWER
    is_platform_admin = Column(Boolean, default=False)  # Separate platform administration privilege
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, SUSPENDED, DELETED
    verification_token = Column(String(255), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    default_workspace_id = Column(String(36), nullable=True)
    onboarding_completed = Column(Boolean, default=True)
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    workspace_memberships = relationship("WorkspaceMembership", back_populates="user", cascade="all, delete-orphan")
    saved_documents = relationship("SavedDocument", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    workspace_type = Column(String(20), default="ORGANIZATION")  # PERSONAL, ORGANIZATION
    owner_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="workspaces")
    owner = relationship("User", foreign_keys=[owner_user_id])
    memberships = relationship("WorkspaceMembership", back_populates="workspace", cascade="all, delete-orphan")
    matters = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(50), default="ATTORNEY")  # OWNER, ADMIN, ATTORNEY, RESEARCHER, REVIEWER, VIEWER
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    workspace = relationship("Workspace", back_populates="memberships")
    user = relationship("User", back_populates="workspace_memberships")


class Project(Base):
    """Represents a Legal Matter or Prior-Art Research Project scoped to a Workspace."""

    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    matter_number = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    client_name = Column(String(255), nullable=True)
    status = Column(String(50), default="ACTIVE")  # DRAFT, ACTIVE, UNDER_REVIEW, COMPLETED, ARCHIVED
    jurisdiction = Column(String(20), default="US")
    technical_domain = Column(String(100), default="General")
    assigned_to_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="matters")
    workspace = relationship("Workspace", back_populates="matters")
    searches = relationship("SearchExecution", back_populates="project", cascade="all, delete-orphan")
    saved_documents = relationship("SavedDocument", back_populates="project", cascade="all, delete-orphan")


class PatentDocument(Base):
    """Class 1: Public Reference Data (Shared across all tenants and workspaces)."""

    __tablename__ = "patent_documents"

    id = Column(String(64), primary_key=True, index=True)  # e.g., US10892482B2
    publication_number = Column(String(64), nullable=False, index=True)
    country = Column(String(10), default="US", index=True)
    title = Column(String(500), nullable=False)
    abstract = Column(Text, nullable=True)
    claims_text = Column(Text, nullable=True)
    claims_list = Column(JSON, default=list)  # list of claims
    description_text = Column(Text, nullable=True)
    cpc_codes = Column(JSON, default=list)  # list of CPC classification strings
    publication_date = Column(String(20), nullable=True, index=True)
    priority_date = Column(String(20), nullable=True, index=True)
    family_id = Column(String(64), nullable=True, index=True)
    assignee = Column(String(255), nullable=True, index=True)
    inventors = Column(JSON, default=list)
    citations = Column(JSON, default=list)  # list of publication numbers cited
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SearchExecution(Base):
    """Search Execution strictly scoped to a Workspace and User."""

    __tablename__ = "search_executions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    raw_claim = Column(Text, nullable=False)
    preamble = Column(Text, nullable=True)
    transition_phrase = Column(String(100), nullable=True)  # e.g. "comprising", "consisting of"
    decomposed_elements = Column(JSON, default=list)  # list of limitation dicts with offsets
    parameters = Column(JSON, default=dict)  # CPC, date filters, jurisdiction, dedupe_family
    stage_status = Column(JSON, default=dict)  # status of bm25, dense, rerank, explain
    latency_ms = Column(JSON, default=dict)  # stage-level latency
    candidate_count = Column(Integer, default=0)
    result_count = Column(Integer, default=0)
    results_cache = Column(JSON, default=list)  # serialized top candidate results
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    project = relationship("Project", back_populates="searches")
    workspace = relationship("Workspace")
    user = relationship("User")
    evidence_mappings = relationship("EvidenceMapping", back_populates="search", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="search", cascade="all, delete-orphan")


class EvidenceMapping(Base):
    """Atomic Claim Limitation Evidence strictly scoped to a Workspace."""

    __tablename__ = "evidence_mappings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    search_id = Column(String(36), ForeignKey("search_executions.id"), nullable=False, index=True)
    doc_id = Column(String(64), ForeignKey("patent_documents.id"), nullable=False, index=True)
    element_id = Column(String(64), nullable=False, index=True)  # e.g. el-1
    limitation_text = Column(Text, nullable=False)
    support_level = Column(
        String(50), nullable=False, default="NOT_FOUND"
    )  # DIRECTLY_SUPPORTED, PARTIALLY_SUPPORTED, RELATED, NOT_FOUND
    exact_quote = Column(Text, nullable=True)
    passage_location = Column(String(100), nullable=True)  # e.g. "Claim 1", "Abstract", "Description [0024]"
    verified = Column(Boolean, default=False)  # True if quote is verified substring in document text
    confidence_score = Column(Float, default=0.0)
    rationale = Column(Text, nullable=True)
    char_start = Column(Integer, nullable=True, default=0)
    char_end = Column(Integer, nullable=True, default=0)
    section = Column(String(50), nullable=True, default="DESCRIPTION")
    paragraph_number = Column(String(50), nullable=True, default="[0001]")
    literal_match = Column(Boolean, default=True)
    semantic_similarity = Column(Float, default=0.0)
    document_hash = Column(String(64), nullable=True)
    provenance = Column(JSON, default=dict)
    reviewer_decision = Column(String(50), default="UNREVIEWED")  # UNREVIEWED, DIRECTLY_SUPPORTING, PARTIALLY_SUPPORTING, CONTEXTUALLY_RELEVANT, INDIRECT_CITATION, HUMAN_VERIFIED, HUMAN_REJECTED
    attorney_review_status = Column(String(50), default="PENDING")  # PENDING, ACCEPTED, REJECTED, MODIFIED
    attorney_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    search = relationship("SearchExecution", back_populates="evidence_mappings")
    workspace = relationship("Workspace")


class Annotation(Base):
    """User Annotation on Search Candidates scoped to a Workspace."""

    __tablename__ = "annotations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True, index=True)
    search_id = Column(String(36), ForeignKey("search_executions.id"), nullable=False, index=True)
    doc_id = Column(String(64), ForeignKey("patent_documents.id"), nullable=False, index=True)
    user_id = Column(String(100), default="examiner-1")
    review_status = Column(
        String(50), default="UNREVIEWED"
    )  # UNREVIEWED, RELEVANT, HIGHLY_RELEVANT, NOT_RELEVANT, FLAGGED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    search = relationship("SearchExecution", back_populates="annotations")
    workspace = relationship("Workspace")


class SavedDocument(Base):
    """Saved Patent Publication scoped to Workspace and User."""

    __tablename__ = "saved_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    doc_id = Column(String(64), ForeignKey("patent_documents.id"), nullable=False, index=True)
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="saved_documents")
    project = relationship("Project", back_populates="saved_documents")
    workspace = relationship("Workspace")


class AuditLog(Base):
    """Compliance Audit Log scoped to Organization or User."""

    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    user_id = Column(String(100), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # SEARCH, VIEW_DOC, EXPORT, ANNOTATE, CREATE_MATTER
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    organization = relationship("Organization", back_populates="audit_logs")


class UsageMetric(Base):
    __tablename__ = "usage_metrics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    period_month = Column(String(10), nullable=False, index=True)  # YYYY-MM
    searches_count = Column(Integer, default=0)
    documents_viewed = Column(Integer, default=0)
    dossiers_exported = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class EvaluationRecord(Base):
    """Class 4: Internal Platform Benchmark Data (Restricted to platform administrators)."""

    __tablename__ = "evaluation_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    run_name = Column(String(100), nullable=False, index=True)
    dataset_name = Column(String(100), nullable=False)
    system_type = Column(String(50), nullable=False, index=True)  # baseline, dense_only, hybrid, full_rerank
    p_at_5 = Column(Float, nullable=False)
    r_at_5 = Column(Float, nullable=False)
    mrr = Column(Float, nullable=False)
    ndcg_at_5 = Column(Float, nullable=False)
    execution_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class SupportSession(Base):
    """
    Time-limited, strictly logged support access for internal platform staff.
    Allows designated platform administrators temporary troubleshooting access to customer workspaces.
    """

    __tablename__ = "support_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    admin_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    ticket_reference = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    actions_performed_count = Column(Integer, default=0)

    admin_user = relationship("User", foreign_keys=[admin_user_id])
    workspace = relationship("Workspace", foreign_keys=[workspace_id])


class QuarantineRecord(Base):
    """
    Holds isolated legacy customer records whose original ownership or workspace attribution
    cannot be established with 100% certainty, safeguarding data without cross-tenant exposure.
    """

    __tablename__ = "quarantine_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # project, search_execution, evidence_mapping, annotation
    entity_id = Column(String(36), nullable=False, index=True)
    original_data = Column(JSON, nullable=False)
    reason = Column(String(255), nullable=False)
    quarantined_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    reviewed_by = Column(String(36), nullable=True)
    resolution_status = Column(String(50), default="PENDING")  # PENDING, RESTORED, PERMANENTLY_DELETED

