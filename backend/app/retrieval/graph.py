import concurrent.futures
import time
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph

from backend.app.logger import get_logger
from backend.app.retrieval.bm25_retriever import BM25Retriever
from backend.app.retrieval.dense_retriever import HydeDenseRetriever
from backend.app.retrieval.explain import ExplanationGenerator
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline
from backend.app.retrieval.reranker import CohereReranker
from backend.app.schemas import DecomposedClaim, RetrievedDocument, SearchFilterParams

logger = get_logger(__name__)


def dict_merge(a: dict, b: dict) -> dict:
    res = dict(a or {})
    res.update(b or {})
    return res


class GraphState(TypedDict):
    raw_claim: str
    filters: SearchFilterParams | None
    decomposed_claim: DecomposedClaim
    bm25_results: list[RetrievedDocument]
    dense_results: list[RetrievedDocument]
    fused_results: list[RetrievedDocument]
    final_results: list[RetrievedDocument]
    stage_status: Annotated[dict[str, str], dict_merge]
    stage_latencies: Annotated[dict[str, float], dict_merge]


# Initialize pipeline components
qu_pipeline = QueryUnderstandingPipeline()
bm25_retriever = BM25Retriever()
dense_retriever = HydeDenseRetriever()
reranker = CohereReranker()
explanation_generator = ExplanationGenerator()


def decompose_and_hyde(state: GraphState):
    start_t = time.time()
    logger.info("Graph node: decompose_and_hyde")
    claim = qu_pipeline.process_claim(state["raw_claim"])
    elapsed = round((time.time() - start_t) * 1000, 2)

    status = dict(state.get("stage_status") or {})
    status["decomposition"] = "EXECUTED"
    latencies = dict(state.get("stage_latencies") or {})
    latencies["decomposition_ms"] = elapsed

    return {
        "decomposed_claim": claim,
        "stage_status": status,
        "stage_latencies": latencies,
    }


def retrieve_bm25(state: GraphState):
    start_t = time.time()
    logger.info("Graph node: retrieve_bm25")
    filters = state.get("filters")

    # Combine claim elements text for full BM25 search
    query = " ".join([e.text for e in state["decomposed_claim"].elements])
    try:
        results = bm25_retriever.search(query, k=50, filters=filters)
        status_val = "EXECUTED"
    except Exception as e:
        logger.error(f"BM25 retrieval error: {e}")
        results = []
        status_val = "FAILED"

    elapsed = round((time.time() - start_t) * 1000, 2)
    status = dict(state.get("stage_status") or {})
    status["bm25"] = status_val
    latencies = dict(state.get("stage_latencies") or {})
    latencies["bm25_ms"] = elapsed

    logger.info(f"BM25 returned {len(results)} candidates in {elapsed}ms")
    return {
        "bm25_results": results,
        "stage_status": status,
        "stage_latencies": latencies,
    }


def retrieve_dense(state: GraphState):
    start_t = time.time()
    logger.info("Graph node: retrieve_dense")
    filters = state.get("filters")
    elements = state["decomposed_claim"].elements

    results: list[RetrievedDocument] = []
    status_val = "EXECUTED"

    def fetch_dense_for_element(element):
        query = element.hyde_passage if element.hyde_passage else element.text
        element_results = dense_retriever.search(query, k=10, filters=filters)
        for res in element_results:
            if element.element_id not in res.matched_elements:
                res.matched_elements.append(element.element_id)
        return element_results

    try:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=min(len(elements) or 1, 4))
        futures = [executor.submit(fetch_dense_for_element, element) for element in elements]
        for future in concurrent.futures.as_completed(futures, timeout=20.0):
            try:
                results.extend(future.result())
            except Exception as e:
                logger.warning(f"Dense search per-element exception: {e}")
        executor.shutdown(wait=False)
    except Exception as e:
        logger.warning(f"Dense search general exception: {e}")
        status_val = "DEGRADED"

    elapsed = round((time.time() - start_t) * 1000, 2)
    status = dict(state.get("stage_status") or {})
    status["dense"] = status_val
    latencies = dict(state.get("stage_latencies") or {})
    latencies["dense_ms"] = elapsed

    logger.info(f"Dense returned {len(results)} candidates across {len(elements)} elements in {elapsed}ms")
    return {
        "dense_results": results,
        "stage_status": status,
        "stage_latencies": latencies,
    }


def fuse(state: GraphState):
    start_t = time.time()
    logger.info("Graph node: fuse")
    bm25_res = state.get("bm25_results", [])
    dense_res = state.get("dense_results", [])

    fused = reciprocal_rank_fusion([bm25_res, dense_res])
    elapsed = round((time.time() - start_t) * 1000, 2)

    status = dict(state.get("stage_status") or {})
    status["fusion"] = "EXECUTED"
    latencies = dict(state.get("stage_latencies") or {})
    latencies["fusion_ms"] = elapsed

    logger.info(f"Fusion unified {len(fused)} unique candidates in {elapsed}ms")
    return {
        "fused_results": fused,
        "stage_status": status,
        "stage_latencies": latencies,
    }


def rerank(state: GraphState):
    start_t = time.time()
    logger.info("Graph node: rerank")
    query = state["raw_claim"]
    candidates = state.get("fused_results", [])

    try:
        reranked = reranker.rerank(query, candidates, top_n=10)
        status_val = "EXECUTED"
    except Exception as e:
        logger.warning(f"Reranker exception: {e}")
        reranked = candidates[:10]
        status_val = "DEGRADED"

    elapsed = round((time.time() - start_t) * 1000, 2)
    status = dict(state.get("stage_status") or {})
    status["reranker"] = status_val
    latencies = dict(state.get("stage_latencies") or {})
    latencies["reranker_ms"] = elapsed

    return {
        "final_results": reranked,
        "stage_status": status,
        "stage_latencies": latencies,
    }


def explain(state: GraphState):
    start_t = time.time()
    logger.info("Graph node: explain")
    final_docs = state.get("final_results", [])
    query_claim = state["decomposed_claim"]

    # Generate claim-chart evidence mappings for top 5 candidates in parallel
    docs_to_analyze = final_docs[:5]
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=min(len(docs_to_analyze) or 1, 3))
    futures = {executor.submit(explanation_generator.explain, doc, query_claim): doc for doc in docs_to_analyze}

    try:
        for future in concurrent.futures.as_completed(futures, timeout=25.0):
            doc = futures[future]
            try:
                doc.explanation = future.result()
            except Exception as e:
                doc.explanation = f"Explanation generation error: {e}"
    except concurrent.futures.TimeoutError:
        logger.warning("Evidence explanation generation timed out for some documents.")
    finally:
        executor.shutdown(wait=False)

    elapsed = round((time.time() - start_t) * 1000, 2)
    status = dict(state.get("stage_status") or {})
    status["evidence_analysis"] = "EXECUTED"
    latencies = dict(state.get("stage_latencies") or {})
    latencies["evidence_ms"] = elapsed

    return {
        "final_results": final_docs,
        "stage_status": status,
        "stage_latencies": latencies,
    }


def build_graph():
    workflow = StateGraph(GraphState)

    workflow.add_node("decompose", decompose_and_hyde)
    workflow.add_node("retrieve_bm25", retrieve_bm25)
    workflow.add_node("retrieve_dense", retrieve_dense)
    workflow.add_node("fuse", fuse)
    workflow.add_node("rerank", rerank)
    workflow.add_node("explain", explain)

    workflow.add_edge(START, "decompose")
    workflow.add_conditional_edges("decompose", lambda _: ["retrieve_bm25", "retrieve_dense"])  # type: ignore[arg-type]
    workflow.add_edge("retrieve_bm25", "fuse")
    workflow.add_edge("retrieve_dense", "fuse")
    workflow.add_edge("fuse", "rerank")
    workflow.add_edge("rerank", "explain")
    workflow.add_edge("explain", END)

    return workflow.compile()


retrieval_graph = build_graph()
