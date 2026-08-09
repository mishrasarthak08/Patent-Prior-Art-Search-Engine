from typing import Literal

from pydantic import BaseModel, Field


class ClaimElement(BaseModel):
    element_id: str
    text: str
    element_type: Literal["structural", "functional", "chemical", "numeric", "method_step"]
    hyde_passage: str | None = None


class DecomposedClaim(BaseModel):
    raw_claim_text: str
    claim_number: str | None = None
    elements: list[ClaimElement]


class RetrievedDocument(BaseModel):
    doc_id: str
    title: str
    snippet: str
    retrieval_sources: list[Literal["bm25", "dense", "hyde"]]
    raw_scores: dict[str, float]
    fused_score: float
    rerank_score: float | None = None
    matched_elements: list[str]
    explanation: str | None = None


DISCLAIMER_TEXT = """This tool assists prior-art research and is NOT a substitute for a registered
patent attorney, patent agent, or professional prior-art search firm.
Results are retrieval-and-ranking outputs from an automated pipeline and
have not been reviewed by a legal professional. Do not rely on this tool's
output, alone, for any filing, licensing, litigation, or invalidity decision."""


class PriorArtSearchResponse(BaseModel):
    query_claim: DecomposedClaim
    results: list[RetrievedDocument]
    pipeline_stage_counts: dict[str, int]
    disclaimer: str = Field(default=DISCLAIMER_TEXT)
    latency_ms: dict[str, float]
