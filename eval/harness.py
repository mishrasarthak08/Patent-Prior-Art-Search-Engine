import logging
from typing import Dict, List
from eval.metrics import precision_at_k, recall_at_k, mrr, ndcg_at_k
from backend.app.retrieval.query_understanding import QueryUnderstandingPipeline
from backend.app.retrieval.bm25_retriever import BM25Retriever
from backend.app.retrieval.dense_retriever import HydeDenseRetriever
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.reranker import CohereReranker

logger = logging.getLogger(__name__)

class EvaluationHarness:
    def __init__(self):
        self.qu = QueryUnderstandingPipeline()
        self.bm25 = BM25Retriever()
        self.dense = HydeDenseRetriever()
        self.reranker = CohereReranker()
        
    def evaluate(self, queries: List[Dict], gold_set: Dict[str, List[str]]):
        results = []
        for q in queries:
            qid = q["query_id"]
            raw_claim = q["claim_text"]
            gold_ids = set(gold_set.get(qid, []))
            
            if not gold_ids:
                logger.warning(f"No gold IDs for {qid}")
                continue
                
            decomposed = self.qu.process_claim(raw_claim)
            query_str = " ".join([e.text for e in decomposed.elements])
            
            # Baseline: BM25
            bm25_docs = self.bm25.search(query_str, k=10)
            bm25_ids = [d.doc_id for d in bm25_docs]
            
            # Hybrid: BM25 + Dense + RRF
            dense_docs = []
            for element in decomposed.elements:
                element_query = element.hyde_passage if element.hyde_passage else element.text
                dense_docs.extend(self.dense.search(element_query, k=10))
            
            hybrid_docs = reciprocal_rank_fusion([bm25_docs, dense_docs])
            hybrid_ids = [d.doc_id for d in hybrid_docs]
            
            # Full: Hybrid + Reranker
            reranked_docs = self.reranker.rerank(raw_claim, hybrid_docs, top_n=10)
            full_ids = [d.doc_id for d in reranked_docs]
            
            # Compute metrics
            def calc_metrics(retrieved):
                return {
                    "P@5": precision_at_k(retrieved, gold_ids, 5),
                    "R@5": recall_at_k(retrieved, gold_ids, 5),
                    "MRR": mrr(retrieved, gold_ids),
                    "nDCG@5": ndcg_at_k(retrieved, gold_ids, 5)
                }
                
            results.append({
                "query_id": qid,
                "baseline": calc_metrics(bm25_ids),
                "hybrid": calc_metrics(hybrid_ids),
                "full": calc_metrics(full_ids)
            })
            
            # Throttle to avoid hitting Gemini Free Tier 15 RPM limit
            import time
            time.sleep(4)
            
        return self._aggregate(results)
        
    def _aggregate(self, results):
        if not results:
            return {}
            
        agg = {"baseline": {}, "hybrid": {}, "full": {}}
        for system in agg.keys():
            for metric in ["P@5", "R@5", "MRR", "nDCG@5"]:
                vals = [r[system][metric] for r in results]
                agg[system][metric] = sum(vals) / len(vals)
        return agg
