from typing import TypedDict, List
from langgraph.graph import StateGraph, START, END
from backend.app.schemas import DecomposedClaim, RetrievedDocument
from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline
from backend.app.retrieval.bm25_retriever import BM25Retriever
from backend.app.retrieval.dense_retriever import HydeDenseRetriever
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.reranker import CohereReranker
from backend.app.retrieval.explain import ExplanationGenerator

from backend.app.logger import get_logger

logger = get_logger(__name__)


class GraphState(TypedDict):
    raw_claim: str
    decomposed_claim: DecomposedClaim
    bm25_results: List[RetrievedDocument]
    dense_results: List[RetrievedDocument]
    fused_results: List[RetrievedDocument]
    final_results: List[RetrievedDocument]


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
    results = []
    # Per-element dense retrieval with HyDE
    for element in state["decomposed_claim"].elements:
        query = element.hyde_passage if element.hyde_passage else element.text
        element_results = dense_retriever.search(query, k=10)
        # Track which elements were matched by which documents
        for res in element_results:
            if element.element_id not in res.matched_elements:
                res.matched_elements.append(element.element_id)
        results.extend(element_results)
    logger.info(f"Dense found {len(results)} candidates across elements")
    return {"dense_results": results}


def fuse(state: GraphState):
    logger.info("Graph node: fuse")
    fused = reciprocal_rank_fusion(
        [state.get("bm25_results", []), state.get("dense_results", [])]
    )
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

    # Generate explanations for top 5 only
    for doc in final_docs[:5]:
        doc.explanation = explanation_generator.explain(doc, query_claim)

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
    workflow.add_conditional_edges(
        "decompose", lambda _: ["retrieve_bm25", "retrieve_dense"]
    )
    workflow.add_edge("retrieve_bm25", "fuse")
    workflow.add_edge("retrieve_dense", "fuse")
    workflow.add_edge("fuse", "rerank")
    workflow.add_edge("rerank", "explain")
    workflow.add_edge("explain", END)

    return workflow.compile()


retrieval_graph = build_graph()
