import os
import time
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.app.schemas import PriorArtSearchResponse, DecomposedClaim, DISCLAIMER_TEXT
from backend.app.retrieval.graph import retrieval_graph

app = FastAPI(title="Patent Prior-Art Search Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    raw_claim: str

@app.post("/search", response_model=PriorArtSearchResponse)
async def search(request: SearchRequest):
    if not request.raw_claim or len(request.raw_claim) > 10000:
        raise HTTPException(status_code=422, detail="Claim text empty or exceeds 10,000 characters")

    start_time = time.time()
    
    # Run graph
    try:
        final_state = retrieval_graph.invoke({"raw_claim": request.raw_claim})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    latency_ms = {"total_ms": (time.time() - start_time) * 1000}
    
    pipeline_stage_counts = {
        "bm25_candidates": len(final_state.get("bm25_results", [])),
        "dense_candidates": len(final_state.get("dense_results", [])),
        "fused_candidates": len(final_state.get("fused_results", [])),
        "final_returned": len(final_state.get("final_results", []))
    }

    return PriorArtSearchResponse(
        query_claim=final_state["decomposed_claim"],
        results=final_state["final_results"],
        pipeline_stage_counts=pipeline_stage_counts,
        disclaimer=DISCLAIMER_TEXT,
        latency_ms=latency_ms
    )

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/ready")
def ready():
    # Check Qdrant connectivity
    qdrant_host = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port = os.getenv("QDRANT_PORT", "6333")
    try:
        response = requests.get(f"http://{qdrant_host}:{qdrant_port}/readyz", timeout=2)
        if response.status_code == 200:
            return {"status": "ready"}
        else:
            raise HTTPException(status_code=503, detail="Qdrant not ready")
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Qdrant connection failed")

@app.get("/eval/latest")
def eval_latest():
    # Stub for Phase 5 lift table
    return {"message": "Eval harness not yet built."}
