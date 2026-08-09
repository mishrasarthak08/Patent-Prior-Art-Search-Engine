from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, List


class ClaimElement(BaseModel):
    element_id: str
    text: str
    element_type: Literal[
        "structural", "functional", "chemical", "numeric", "method_step"
    ]
    hyde_passage: Optional[str] = None


class DecomposedClaim(BaseModel):
    raw_claim_text: str
    claim_number: Optional[str] = None
    elements: List[ClaimElement]


class RetrievedDocument(BaseModel):
    doc_id: str
    title: str
    snippet: str
    retrieval_sources: List[Literal["bm25", "dense", "hyde"]]
    raw_scores: Dict[str, float]
    fused_score: float
    rerank_score: Optional[float] = None
    matched_elements: List[str]
    explanation: Optional[str] = None


DISCLAIMER_TEXT = """This tool assists prior-art research and is NOT a substitute for a registered
patent attorney, patent agent, or professional prior-art search firm.
Results are retrieval-and-ranking outputs from an automated pipeline and
have not been reviewed by a legal professional. Do not rely on this tool's
output, alone, for any filing, licensing, litigation, or invalidity decision."""


class PriorArtSearchResponse(BaseModel):
    query_claim: DecomposedClaim
    results: List[RetrievedDocument]
    pipeline_stage_counts: Dict[str, int]
    disclaimer: str = Field(default=DISCLAIMER_TEXT)
    latency_ms: Dict[str, float]
