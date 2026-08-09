import os
import time

import langchain
import requests
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from langchain_community.cache import SQLiteCache
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from backend.app.logger import get_logger
from backend.app.retrieval.graph import retrieval_graph
from backend.app.schemas import DISCLAIMER_TEXT, PriorArtSearchResponse

langchain.llm_cache = SQLiteCache(database_path=".langchain.db")

logger = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Patent Prior-Art Search Engine API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

app.add_middleware(CorrelationIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
API_KEY = os.getenv("API_KEY", "dev_key")


async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    raise HTTPException(status_code=401, detail="Could not validate credentials")


class SearchRequest(BaseModel):
    raw_claim: str = Field(..., max_length=10000)


@app.post("/search", response_model=PriorArtSearchResponse)
@limiter.limit("5/minute")
async def search(request: Request, search_request: SearchRequest, api_key: str = Depends(get_api_key)):
    if not search_request.raw_claim.strip():
        raise HTTPException(status_code=422, detail="Claim text empty")

    logger.info("Received search request", extra={"claim_length": len(search_request.raw_claim)})
    start_time = time.time()

    # Run graph
    try:
        final_state = retrieval_graph.invoke({"raw_claim": search_request.raw_claim})
    except Exception as e:
        logger.error(f"Graph execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    latency_ms = {"total_ms": (time.time() - start_time) * 1000}

    pipeline_stage_counts = {
        "bm25_candidates": len(final_state.get("bm25_results", [])),
        "dense_candidates": len(final_state.get("dense_results", [])),
        "fused_candidates": len(final_state.get("fused_results", [])),
        "final_returned": len(final_state.get("final_results", [])),
    }

    logger.info(
        "Search request completed",
        extra={"latency_ms": latency_ms["total_ms"], **pipeline_stage_counts},
    )

    return PriorArtSearchResponse(
        query_claim=final_state["decomposed_claim"],
        results=final_state["final_results"],
        pipeline_stage_counts=pipeline_stage_counts,
        disclaimer=DISCLAIMER_TEXT,
        latency_ms=latency_ms,
    )


@app.get("/")
def root():
    return {"status": "ok"}


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
            logger.warning("Qdrant not ready")
            raise HTTPException(status_code=503, detail="Qdrant not ready")
    except requests.RequestException as e:
        logger.warning(f"Qdrant connection failed: {e}")
        raise HTTPException(status_code=503, detail="Qdrant connection failed")


@app.get("/eval/latest")
def eval_latest(api_key: str = Depends(get_api_key)):
    import csv

    lift_table_path = "eval/results/lift_table.csv"
    if not os.path.exists(lift_table_path):
        raise HTTPException(status_code=404, detail="Eval harness results not found.")

    results = []
    with open(lift_table_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            results.append(row)
    return {"metrics": results}
