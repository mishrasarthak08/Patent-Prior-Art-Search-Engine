import os
import sys

# Append current dir to path to allow importing backend
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.app.retrieval.explain import ExplanationGenerator
from backend.app.schemas import ClaimElement, DecomposedClaim, RetrievedDocument

generator = ExplanationGenerator()

claim = DecomposedClaim(
    raw_claim_text="dummy text", elements=[ClaimElement(element_id="el-1", text="dummy", element_type="structural")]
)

doc = RetrievedDocument(
    doc_id="1",
    title="test",
    snippet="test",
    retrieval_sources=["bm25"],
    raw_scores={"bm25": 1.0},
    fused_score=1.0,
    matched_elements=["el-1"],
)

try:
    print(generator.explain(doc, claim))
except Exception:
    import traceback

    traceback.print_exc()
