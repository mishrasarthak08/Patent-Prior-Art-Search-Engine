from typing import TypedDict
import concurrent.futures

from langgraph.graph import END, START, StateGraph

from backend.app.logger import get_logger
from backend.app.retrieval.bm25_retriever import BM25Retriever
from backend.app.retrieval.dense_retriever import HydeDenseRetriever
from backend.app.retrieval.explain import ExplanationGenerator
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline
from backend.app.retrieval.reranker import CohereReranker
from backend.app.schemas import DecomposedClaim, RetrievedDocument

logger = get_logger(__name__)


class GraphState(TypedDict):
    raw_claim: str
    decomposed_claim: DecomposedClaim
    bm25_results: list[RetrievedDocument]
    dense_results: list[RetrievedDocument]
    fused_results: list[RetrievedDocument]
    final_results: list[RetrievedDocument]


# Initialize components
qu_pipeline = QueryUnderstandingPipeline()
bm25_retriever = BM25Retriever()
dense_retriever = HydeDenseRetriever()
reranker = CohereReranker()
explanation_generator = ExplanationGenerator()


def decompose_and_hyde(state: GraphState):
    logger.info("Graph node: decompose_and_hyde")
    claim = qu_pipeline.process_claim(state["raw_claim"])
    return {"decomposed_claim": claim}


def retrieve_bm25(state: GraphState):
    logger.info("Graph node: retrieve_bm25")
    # Combine claim elements text for full BM25 search
    query = " ".join([e.text for e in state["decomposed_claim"].elements])
    results = bm25_retriever.search(query, k=50)
    logger.info(f"BM25 found {len(results)} candidates")
    return {"bm25_results": results}


def retrieve_dense(state: GraphState):
    logger.info("Graph node: retrieve_dense")
    
    if len(state["decomposed_claim"].elements) == 1 and state["decomposed_claim"].elements[0].element_id == "el-fallback":
        logger.info("Fallback decomposition detected. Skipping dense retrieval to save API quota.")
        return {"dense_results": []}

    results = []
    # Per-element dense retrieval with HyDE (Parallelized)
    def fetch_dense_for_element(element):
        query = element.hyde_passage if element.hyde_passage else element.text
        element_results = dense_retriever.search(query, k=10)
        for res in element_results:
            if element.element_id not in res.matched_elements:
                res.matched_elements.append(element.element_id)
        return element_results

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
    futures = [executor.submit(fetch_dense_for_element, element) for element in state["decomposed_claim"].elements]
    
    try:
        for future in concurrent.futures.as_completed(futures, timeout=30.0):
            try:
                results.extend(future.result())
            except Exception as e:
                logger.error(f"Dense retrieval for an element failed: {e}")
    except concurrent.futures.TimeoutError:
        logger.warning("Dense retrieval for some elements timed out.")
    finally:
        executor.shutdown(wait=False)
    logger.info(f"Dense found {len(results)} candidates across elements")
    return {"dense_results": results}


def fuse(state: GraphState):
    logger.info("Graph node: fuse")
    fused = reciprocal_rank_fusion([state.get("bm25_results", []), state.get("dense_results", [])])
    logger.info(f"Fusion resulted in {len(fused)} unique candidates")
    return {"fused_results": fused}


def rerank(state: GraphState):
    logger.info("Graph node: rerank")
    # Rerank against the original raw claim
    query = state["raw_claim"]
    reranked = reranker.rerank(query, state["fused_results"], top_n=10)
    return {"final_results": reranked}


def explain(state: GraphState):
    logger.info("Graph node: explain")
    final_docs = state["final_results"]
    query_claim = state["decomposed_claim"]

    # Generate explanations for top 5 only in parallel
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    futures = {
        executor.submit(explanation_generator.explain, doc, query_claim): doc
        for doc in final_docs[:5]
    }
    try:
        for future in concurrent.futures.as_completed(futures, timeout=30.0):
            doc = futures[future]
            try:
                doc.explanation = future.result()
            except Exception as e:
                doc.explanation = f"Failed to generate explanation: {e}"
    except concurrent.futures.TimeoutError:
        logger.warning("Explanation generation timed out (likely rate limit retries).")
        # Handle any futures that didn't complete within the timeout
        for future, doc in futures.items():
            if not getattr(doc, 'explanation', None):
                doc.explanation = "Explanation omitted due to API timeout/quota."
    finally:
        executor.shutdown(wait=False)

    return {"final_results": final_docs}


def build_graph():
    workflow = StateGraph(GraphState)

    workflow.add_node("decompose", decompose_and_hyde)
    workflow.add_node("retrieve_bm25", retrieve_bm25)
    workflow.add_node("retrieve_dense", retrieve_dense)
    workflow.add_node("fuse", fuse)
    workflow.add_node("rerank", rerank)
    workflow.add_node("explain", explain)

    workflow.add_edge(START, "decompose")
    workflow.add_conditional_edges("decompose", lambda _: ["retrieve_bm25", "retrieve_dense"])
    workflow.add_edge("retrieve_bm25", "fuse")
    workflow.add_edge("retrieve_dense", "fuse")
    workflow.add_edge("fuse", "rerank")
    workflow.add_edge("rerank", "explain")
    workflow.add_edge("explain", END)

    return workflow.compile()


retrieval_graph = build_graph()
