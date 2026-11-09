from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ClaimElement(BaseModel):
    element_id: str = Field(..., description="Unique limitation identifier (e.g., el-1)")
    text: str = Field(..., description="Verbatim limitation extracted from the claim")
    element_type: Literal["structural", "functional", "chemical", "numeric", "method_step", "condition"] = Field(
        default="structural", description="Classification of the limitation"
    )
    start_char: int | None = Field(default=None, description="Starting character offset in submitted claim")
    end_char: int | None = Field(default=None, description="Ending character offset in submitted claim")
    technical_terms: list[str] = Field(default_factory=list, description="Extracted key technical entities/phrases")
    hyde_passage: str | None = Field(
        default=None, description="Hypothetical prior-art passage for dense query expansion"
    )
    normalized_concept: str | None = Field(default=None, description="Standardized concept definition")


class DecomposedClaim(BaseModel):
    raw_claim_text: str = Field(..., description="Full raw submitted patent claim text")
    preamble: str | None = Field(default=None, description="Claim preamble (e.g., 'A lithium-ion secondary battery')")
    transition: str | None = Field(default="comprising", description="Transition phrase (e.g., 'comprising')")
    claim_number: str | None = Field(default="1", description="Claim number if present")
    elements: list[ClaimElement] = Field(default_factory=list, description="Atomic technical limitations")


class SearchFilterParams(BaseModel):
    cpc_codes: list[str] = Field(
        default_factory=list, description="Filter by CPC subclass or groups (e.g. ['H01M', 'G06N'])"
    )
    date_from: str | None = Field(default=None, description="Filter publications on or after YYYY-MM-DD")
    date_to: str | None = Field(default=None, description="Filter publications on or before YYYY-MM-DD")
    jurisdiction: str | None = Field(
        default=None, description="Filter by issuing patent office (e.g., 'US', 'EP', 'WO')"
    )
    deduplicate_families: bool = Field(
        default=False, description="Collapse patent family members into representative document"
    )


class LimitationEvidence(BaseModel):
    element_id: str = Field(..., description="Target limitation identifier")
    limitation_text: str = Field(..., description="Original claim limitation text")
    support_level: Literal[
        "DIRECTLY_SUPPORTED", "PARTIALLY_SUPPORTED", "RELATED_DISCLOSURE", "AMBIGUOUS", "NOT_FOUND"
    ] = Field(default="NOT_FOUND", description="Relevance and evidence support classification")
    exact_quote: str | None = Field(default=None, description="Exact quotation from the document text")
    passage_location: str | None = Field(
        default=None, description="Section reference (e.g., 'Claim 1', 'Description [0035]')"
    )
    verified: bool = Field(
        default=False, description="True if quote is verified verbatim substring in patent disclosure"
    )
    confidence_score: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Heuristic evidence support confidence [0, 1]"
    )
    rationale: str | None = Field(
        default=None, description="Analysis explaining how the passage relates to the limitation"
    )
    attorney_review_status: str | None = Field(default="PENDING")
    attorney_notes: str | None = Field(default=None)


class RetrievedDocument(BaseModel):
    doc_id: str
    publication_number: str | None = None
    title: str
    snippet: str
    abstract: str | None = None
    assignee: str | None = None
    publication_date: str | None = None
    family_id: str | None = None
    cpc_codes: list[str] = Field(default_factory=list)
    retrieval_sources: list[str] = Field(default_factory=list)  # ["bm25", "dense", "hyde"]
    raw_scores: dict[str, float] = Field(default_factory=dict)
    fused_score: float = Field(default=0.0)
    rerank_score: float | None = None
    matched_elements: list[str] = Field(default_factory=list)
    claim_chart: list[LimitationEvidence] = Field(default_factory=list)
    explanation: str | None = None


DISCLAIMER_TEXT = """This software provides technical retrieval and candidate evidence mapping assistance.
It is NOT a legal opinion, patentability evaluation, or infringement determination.
Scores generated represent mathematical retrieval and reranking similarity metrics, NOT calibrated
probabilities of 35 U.S.C. § 102 anticipation or § 103 obviousness. Verified quotations denote
exact substring concordance with underlying public patent gazettes; they do not represent legal
conclusions of limitation mapping. Independent evaluation by a registered patent practitioner is required."""


class PriorArtSearchResponse(BaseModel):
    search_id: str | None = None
    query_claim: DecomposedClaim
    results: list[RetrievedDocument]
    pipeline_stage_counts: dict[str, int]
    pipeline_stage_status: dict[str, str] = Field(default_factory=dict)
    disclaimer: str = Field(default=DISCLAIMER_TEXT)
    latency_ms: dict[str, float]


class PriorArtSearchRequest(BaseModel):
    raw_claim: str
    project_id: str | None = None
    top_k: int = 5
    confidence_threshold: float = 0.0
    filters: SearchFilterParams = Field(default_factory=SearchFilterParams)


# --- Enterprise Patent Search Platform Schemas ---


class UserLogin(BaseModel):
    email: str
    password: str


class UserRegister(BaseModel):
    email: str
    full_name: str
    password: str
    organization_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    org_id: str | None = None
    default_workspace_id: str | None = None
    onboarding_completed: bool = True
    preferences: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class OnboardingRequest(BaseModel):
    role: str | None = None
    technical_domain: str | None = "General"
    preferred_jurisdictions: list[str] = Field(default_factory=lambda: ["US", "EP", "WO"])
    default_search_mode: str | None = "hybrid"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class WorkspaceCreate(BaseModel):
    name: str
    description: str | None = None
    is_default: bool = False
    workspace_type: str = "ORGANIZATION"  # PERSONAL or ORGANIZATION


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str | None = None
    name: str
    description: str | None = None
    is_default: bool = False
    workspace_type: str = "ORGANIZATION"
    owner_user_id: str | None = None
    matters_count: int = 0
    searches_count: int = 0
    created_at: datetime | None = None


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    plan: str
    max_seats: int
    created_at: datetime | None = None


class OrganizationInvite(BaseModel):
    email: str
    role: str = "ATTORNEY"


class MatterCreate(BaseModel):
    name: str
    matter_number: str | None = None
    description: str | None = None
    client_name: str | None = None
    jurisdiction: str = "US"
    technical_domain: str = "General"
    workspace_id: str | None = None
    notes: str | None = None


class MatterUpdate(BaseModel):
    name: str | None = None
    matter_number: str | None = None
    description: str | None = None
    client_name: str | None = None
    status: str | None = None
    jurisdiction: str | None = None
    technical_domain: str | None = None
    notes: str | None = None


class MatterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    matter_number: str | None = None
    description: str | None = None
    client_name: str | None = None
    status: str
    jurisdiction: str | None = None
    technical_domain: str | None = None
    workspace_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    searches_count: int = 0
    saved_documents_count: int = 0


class PatentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    publication_number: str
    title: str
    abstract: str | None = None
    country: str = "US"
    assignee: str | None = None
    publication_date: str | None = None
    cpc_codes: list[str] = Field(default_factory=list)
    family_id: str | None = None


class PatentCompareRequest(BaseModel):
    doc_ids: list[str] = Field(..., min_length=2, max_length=4)


class PatentCompareItem(BaseModel):
    doc_id: str
    publication_number: str
    title: str
    assignee: str | None = None
    publication_date: str | None = None
    cpc_codes: list[str] = Field(default_factory=list)
    abstract: str | None = None
    independent_claim: str | None = None
    key_limitations: list[str] = Field(default_factory=list)


class PatentCompareResponse(BaseModel):
    patents: list[PatentCompareItem]
    common_cpc_codes: list[str] = Field(default_factory=list)
    differentiating_factors: list[str] = Field(default_factory=list)


class SavedDocumentCreate(BaseModel):
    doc_id: str
    project_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    notes: str | None = None


class SavedDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    doc_id: str
    title: str
    publication_number: str
    assignee: str | None = None
    project_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    notes: str | None = None
    created_at: datetime | None = None


class EvidenceUpdate(BaseModel):
    attorney_review_status: str  # ACCEPTED, REJECTED, MODIFIED
    attorney_notes: str | None = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_email: str | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    ip_address: str | None = None
    created_at: datetime | None = None


class UsageMetricOut(BaseModel):
    period_month: str
    searches_count: int
    documents_viewed: int
    dossiers_exported: int
    max_searches: int = 500
    max_exports: int = 100


class EvidenceLedgerItem(BaseModel):
    id: str
    search_id: str
    doc_id: str
    publication_number: str | None = None
    patent_title: str | None = None
    element_id: str
    limitation_text: str
    support_level: str
    exact_quote: str | None = None
    section: str | None = None
    paragraph_number: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    literal_match: bool = False
    semantic_similarity: float = 0.0
    verified: bool = False
    confidence_score: float = 0.0
    rationale: str | None = None
    document_hash: str | None = None
    reviewer_decision: str = "UNREVIEWED"
    attorney_review_status: str = "PENDING"
    attorney_notes: str | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class EvidenceReviewRequest(BaseModel):
    decision: str  # HUMAN_VERIFIED, HUMAN_REJECTED, DIRECTLY_SUPPORTING, PARTIALLY_SUPPORTING
    notes: str | None = None


class IterativeSearchRequest(BaseModel):
    raw_claim: str
    project_id: str | None = None
    filters: SearchFilterParams | None = None
    top_k: int = 15


class MultiClaimMapRequest(BaseModel):
    raw_claim: str
    doc_ids: list[str]


class MultiClaimMapColumn(BaseModel):
    doc_id: str
    publication_number: str
    title: str
    assignee: str | None = None
    family_id: str | None = None
    country: str | None = None


class MultiClaimMapCell(BaseModel):
    element_id: str
    doc_id: str
    support_level: str
    confidence_score: float
    exact_quote: str | None = None
    paragraph_number: str | None = None
    section: str | None = None
    verified: bool = False
    rationale: str | None = None


class MultiClaimMapResponse(BaseModel):
    claim_preamble: str | None = None
    elements: list[ClaimElement]
    columns: list[MultiClaimMapColumn]
    matrix: list[list[MultiClaimMapCell]]
