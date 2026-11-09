import json
import logging
import os

from backend.app.retrieval.bm25_retriever import BM25Retriever
from backend.app.retrieval.dense_retriever import HydeDenseRetriever
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.iterative_search import IterativeSearchEngine
from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline
from backend.app.retrieval.reranker import CohereReranker
from tests.eval.metrics import mrr, ndcg_at_k, precision_at_k, recall_at_k

logger = logging.getLogger(__name__)


class EvaluationHarness:
    def __init__(self):
        self.qu = QueryUnderstandingPipeline()
        self.bm25 = BM25Retriever()
        self.dense = HydeDenseRetriever()
        self.reranker = CohereReranker()
        self.iterative = IterativeSearchEngine()

    def run_ablation_benchmark(self, dataset_path: str = "eval/benchmark_dataset.json") -> dict[str, dict[str, float]]:
        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Benchmark dataset not found at {dataset_path}")

        with open(dataset_path) as f:
            benchmarks = json.load(f)

        logger.info(f"Loaded {len(benchmarks)} benchmark queries for scientific evaluation.")

        systems = ["bm25_only", "dense_only", "hybrid_rrf", "hybrid_rerank", "iterative_search"]
        system_metrics: dict[str, dict[str, list[float]]] = {
            sys: {"P@5": [], "R@5": [], "MRR": [], "nDCG@5": []} for sys in systems
        }

        for item in benchmarks:
            raw_claim = item["claim_text"]
            gold_ids: set[str] = set(item["gold_patent_ids"])

            # 1. Claim Decomposition & Understanding
            decomposed = self.qu.process_claim(raw_claim)
            query_str = " ".join([e.text for e in decomposed.elements])

            # System 1: BM25 Only
            bm25_docs = self.bm25.search(query_str, k=10)
            bm25_ids = [d.doc_id for d in bm25_docs]

            # System 2: Dense Only
            dense_docs = []
            for elem in decomposed.elements:
                q = elem.hyde_passage if elem.hyde_passage else elem.text
                dense_docs.extend(self.dense.search(q, k=5))
            dense_ids = [d.doc_id for d in dense_docs]

            # System 3: Hybrid RRF
            hybrid_docs = reciprocal_rank_fusion([bm25_docs, dense_docs])
            hybrid_ids = [d.doc_id for d in hybrid_docs]

            # System 4: Hybrid Rerank
            reranked_docs = self.reranker.rerank(raw_claim, hybrid_docs, top_n=10)
            rerank_ids = [d.doc_id for d in reranked_docs]

            # System 5: Iterative Search with Limitation Gap Resolution
            iterative_res = self.iterative.run_multi_strategy_discovery(decomposed, top_k=10)
            iterative_ids = [d.doc_id for d in iterative_res["results"]]

            candidates_map = {
                "bm25_only": bm25_ids,
                "dense_only": dense_ids,
                "hybrid_rrf": hybrid_ids,
                "hybrid_rerank": rerank_ids,
                "iterative_search": iterative_ids,
            }

            for sys_name, ids in candidates_map.items():
                p5 = precision_at_k(ids, gold_ids, 5)
                r5 = recall_at_k(ids, gold_ids, 5)
                m = mrr(ids, gold_ids)
                n5 = ndcg_at_k(ids, gold_ids, 5)

                system_metrics[sys_name]["P@5"].append(p5)
                system_metrics[sys_name]["R@5"].append(r5)
                system_metrics[sys_name]["MRR"].append(m)
                system_metrics[sys_name]["nDCG@5"].append(n5)

        # Aggregate averages
        aggregated: dict[str, dict[str, float]] = {}
        for sys_name, metrics in system_metrics.items():
            aggregated[sys_name] = {
                "P@5": round(sum(metrics["P@5"]) / len(metrics["P@5"]), 4) if metrics["P@5"] else 0.0,
                "R@5": round(sum(metrics["R@5"]) / len(metrics["R@5"]), 4) if metrics["R@5"] else 0.0,
                "MRR": round(sum(metrics["MRR"]) / len(metrics["MRR"]), 4) if metrics["MRR"] else 0.0,
                "nDCG@5": round(sum(metrics["nDCG@5"]) / len(metrics["nDCG@5"]), 4) if metrics["nDCG@5"] else 0.0,
            }

        return aggregated
