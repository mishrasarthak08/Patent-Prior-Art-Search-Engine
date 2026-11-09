"""
Iterative Multi-Strategy Search & Limitation Gap Analysis Engine
Executes coordinated multi-vector discovery (exact phrase, dense vector,
limitation-level queries, synonym expansion, citation graph hops, and patent family exploration).
Analyzes limitation coverage gaps and automatically dispatches targeted follow-up queries.
"""

import logging
import re
import time
from typing import Any, cast

from sqlalchemy.orm import Session

from backend.app.db.models import PatentDocument
from backend.app.db.session import SessionLocal
from backend.app.retrieval.bm25_retriever import BM25Retriever
from backend.app.retrieval.dense_retriever import HydeDenseRetriever
from backend.app.retrieval.evidence_analyzer import EvidenceAnalyzer
from backend.app.retrieval.fusion import reciprocal_rank_fusion
from backend.app.retrieval.reranker import CohereReranker
from backend.app.schemas import (
    DecomposedClaim,
    RetrievedDocument,
    SearchFilterParams,
)

logger = logging.getLogger(__name__)

# Specialized Patent Synonym & Domain Expression Expansion Dictionary
PATENT_EXPANSION_LEXICON: dict[str, list[str]] = {
    "anode": ["negative electrode", "anode active material", "counter electrode"],
    "cathode": ["positive electrode", "cathode active material", "lithium metal oxide"],
    "electrolyte": ["non-aqueous electrolyte", "solid electrolyte", "liquid electrolyte solution", "ionic conductor"],
    "silicon": ["nanostructured silicon", "silicon-graphite composite", "Si nanoparticles", "porous silicon"],
    "fec": ["fluoroethylene carbonate", "fluorinated cyclic carbonate", "SEI-forming additive"],
    "solid-state": ["all-solid-state", "solid electrolyte membrane", "sulfide argyrodite"],
    "argyrodite": ["Li6PS5Cl", "sulfide solid electrolyte", "halogen-doped sulfide"],
    "transformer": ["self-attention network", "multi-head attention", "generative pre-trained transformer"],
    "pruning": ["token pruning", "attention head sparsity", "dynamic sparsity threshold"],
    "reram": ["resistive random-access memory", "crossbar array", "in-memory analog computing"],
    "nanosheet": ["gate-all-around", "GAA", "suspended nanosheet channel", "inner spacer"],
    "lnp": ["lipid nanoparticle", "ionizable amino lipid", "helper phospholipid", "PEG-lipid"],
    "mrna": ["messenger RNA", "synthetic transcript", "1-methylpseudouridine modified RNA"],
    "qubit": ["superconducting qubit", "fluxonium", "transmon", "Josephson junction"],
    "lidar": ["frequency-modulated continuous-wave", "FMCW", "optical phased array", "OPA"],
    "perovskite": ["metal halide perovskite", "carbazole SAM", "tandem subcell"],
    "crispr": ["Cas12a", "base editing", "guide RNA", "protospacer adjacent motif"],
    "micro-led": ["microLED", "gallium nitride emitter", "fluidic self-assembly mass transfer"],
    "consensus": ["Byzantine fault tolerance", "threshold signature", "verifiable random function"],
}


def expand_query_terms(query_str: str) -> list[str]:
    """Extracts domain-specific synonym expansions from the query string."""
    tokens = re.findall(r"\b[a-zA-Z0-9\-]+\b", query_str.lower())
    expansions = []
    for token in tokens:
        if token in PATENT_EXPANSION_LEXICON:
            expansions.extend(PATENT_EXPANSION_LEXICON[token])
    return list(dict.fromkeys(expansions))


class IterativeSearchEngine:
    def __init__(self):
        self.bm25_retriever = BM25Retriever()
        self.dense_retriever = HydeDenseRetriever()
        self.reranker = CohereReranker()
        self.evidence_analyzer = EvidenceAnalyzer()

    def run_multi_strategy_discovery(
        self,
        decomposed_claim: DecomposedClaim,
        filters: SearchFilterParams | None = None,
        top_k: int = 15,
        db: Session | None = None,
    ) -> dict[str, Any]:
        """
        Executes comprehensive multi-strategy prior-art discovery:
        1. Full claim lexical BM25
        2. Limitation-specific subqueries
        3. Synonym and terminology expansions
        4. Dense vector retrieval (HyDE)
        5. Reciprocal rank fusion
        6. Limitation coverage gap identification
        7. Automated follow-up searches for missing limitations
        8. Citation graph & family expansion
        9. Cohere reranking
        """
        start_time = time.time()
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            strategy_provenance = []
            retrieved_pools: list[list[RetrievedDocument]] = []

            # -------------------------------------------------------------
            # Strategy 1: Global Exact & Lexical BM25 Search
            # -------------------------------------------------------------
            full_claim_text = " ".join([e.text for e in decomposed_claim.elements])
            bm25_primary = self.bm25_retriever.search(full_claim_text, k=40, filters=filters)
            for doc in bm25_primary:
                if "bm25_full_claim" not in doc.retrieval_sources:
                    doc.retrieval_sources.append("bm25_full_claim")
            retrieved_pools.append(bm25_primary)
            strategy_provenance.append({
                "strategy": "BM25_FULL_CLAIM",
                "query": full_claim_text[:120] + "...",
                "candidate_count": len(bm25_primary),
            })

            # -------------------------------------------------------------
            # Strategy 2: Limitation-Specific Targeted BM25 Search
            # -------------------------------------------------------------
            limitation_results = []
            for element in decomposed_claim.elements:
                elem_docs = self.bm25_retriever.search(element.text, k=15, filters=filters)
                for d in elem_docs:
                    if element.element_id not in d.matched_elements:
                        d.matched_elements.append(element.element_id)
                    if "limitation_subquery" not in d.retrieval_sources:
                        d.retrieval_sources.append("limitation_subquery")
                limitation_results.extend(elem_docs)

            retrieved_pools.append(limitation_results)
            strategy_provenance.append({
                "strategy": "LIMITATION_SUBQUERIES",
                "subqueries_count": len(decomposed_claim.elements),
                "candidate_count": len(limitation_results),
            })

            # -------------------------------------------------------------
            # Strategy 3: Synonym & Terminology Expansion Search
            # -------------------------------------------------------------
            expanded_terms = expand_query_terms(full_claim_text)
            if expanded_terms:
                expansion_query = " ".join(expanded_terms[:8])
                expansion_docs = self.bm25_retriever.search(expansion_query, k=25, filters=filters)
                for d in expansion_docs:
                    if "synonym_expansion" not in d.retrieval_sources:
                        d.retrieval_sources.append("synonym_expansion")
                retrieved_pools.append(expansion_docs)
                strategy_provenance.append({
                    "strategy": "SYNONYM_EXPANSION",
                    "expanded_terms": expanded_terms[:6],
                    "candidate_count": len(expansion_docs),
                })

            # -------------------------------------------------------------
            # Strategy 4: Dense Vector / HyDE Retrieval
            # -------------------------------------------------------------
            dense_docs = []
            for element in decomposed_claim.elements:
                q = element.hyde_passage or element.text
                d_hits = self.dense_retriever.search(q, k=10, filters=filters)
                for dh in d_hits:
                    if element.element_id not in dh.matched_elements:
                        dh.matched_elements.append(element.element_id)
                dense_docs.extend(d_hits)

            if dense_docs:
                retrieved_pools.append(dense_docs)
                strategy_provenance.append({
                    "strategy": "DENSE_HYDE_VECTOR",
                    "candidate_count": len(dense_docs),
                })

            # Fuse primary candidate pools
            fused_candidates = reciprocal_rank_fusion(retrieved_pools)

            # -------------------------------------------------------------
            # Strategy 5: Limitation Coverage Gap Analysis
            # -------------------------------------------------------------
            top_candidates = fused_candidates[:8]
            limitation_gaps = []
            gaps_detected = []

            for element in decomposed_claim.elements:
                best_support = "NOT_FOUND"
                best_confidence = 0.0
                best_doc = None

                # Test support against top candidate docs in database
                for cand in top_candidates:
                    doc_obj = db.query(PatentDocument).filter(PatentDocument.id == cand.doc_id).first()
                    if not doc_obj:
                        continue
                    full_doc_text = str(doc_obj.title or "") + "\n" + str(doc_obj.abstract or "") + "\n" + str(doc_obj.description_text or "")
                    em = self.evidence_analyzer.analyze_limitation(element.text, full_doc_text)
                    if em.confidence_score > best_confidence:
                        best_confidence = em.confidence_score
                        best_support = em.support_level
                        best_doc = cand.doc_id

                is_gap = (best_support == "NOT_FOUND" or best_confidence < 0.65)
                gap_info = {
                    "element_id": element.element_id,
                    "limitation_text": element.text,
                    "initial_support": best_support,
                    "initial_confidence": round(best_confidence, 2),
                    "best_doc_id": best_doc,
                    "is_gap": is_gap,
                    "follow_up_dispatched": False,
                    "resolved_by_doc_id": None,
                    "final_support": best_support,
                }

                if is_gap:
                    gaps_detected.append(element)
                limitation_gaps.append(gap_info)

            # -------------------------------------------------------------
            # Strategy 6: Automated Follow-Up Iterative Search for Gaps
            # -------------------------------------------------------------
            follow_up_results = []
            follow_up_log = []

            for gap_element in gaps_detected:
                # Formulate targeted expansion query
                gap_synonyms = expand_query_terms(gap_element.text)
                if gap_synonyms:
                    follow_query = gap_element.text + " " + " ".join(gap_synonyms)
                else:
                    follow_query = gap_element.text

                follow_docs = self.bm25_retriever.search(follow_query, k=15, filters=filters)
                for fd in follow_docs:
                    if "gap_targeted_search" not in fd.retrieval_sources:
                        fd.retrieval_sources.append("gap_targeted_search")
                    if gap_element.element_id not in fd.matched_elements:
                        fd.matched_elements.append(gap_element.element_id)
                follow_up_results.extend(follow_docs)

                # Mark gap as dispatched
                for lg in limitation_gaps:
                    if lg["element_id"] == gap_element.element_id:
                        lg["follow_up_dispatched"] = True
                        if follow_docs:
                            lg["resolved_by_doc_id"] = follow_docs[0].doc_id
                            lg["final_support"] = "PARTIALLY_SUPPORTED"

                follow_up_log.append({
                    "element_id": gap_element.element_id,
                    "dispatched_query": follow_query[:100] + "...",
                    "hits_found": len(follow_docs),
                    "top_match_id": follow_docs[0].doc_id if follow_docs else None,
                })

            if follow_up_results:
                retrieved_pools.append(follow_up_results)
                strategy_provenance.append({
                    "strategy": "GAP_TARGETED_ITERATIVE",
                    "gaps_addressed": len(gaps_detected),
                    "candidate_count": len(follow_up_results),
                })

            # -------------------------------------------------------------
            # Strategy 7: Citation Graph & Patent Family Expansion
            # -------------------------------------------------------------
            citation_leads = []
            family_leads = []
            graph_expansion_docs: list[RetrievedDocument] = []

            for cand in top_candidates[:4]:
                doc_entity = db.query(PatentDocument).filter(PatentDocument.id == cand.doc_id).first()
                if not doc_entity:
                    continue

                # Add family members
                if doc_entity.family_id:
                    fams = (
                        db.query(PatentDocument)
                        .filter(PatentDocument.family_id == doc_entity.family_id, PatentDocument.id != doc_entity.id)
                        .all()
                    )
                    for fm in fams:
                        family_leads.append(str(fm.id))
                        fm_cpc = cast(list[str], fm.cpc_codes or [])
                        graph_expansion_docs.append(
                            RetrievedDocument(
                                doc_id=str(fm.id),
                                publication_number=str(fm.publication_number),
                                title=str(fm.title),
                                snippet=str(fm.abstract or "")[:300],
                                abstract=str(fm.abstract) if fm.abstract else None,
                                assignee=str(fm.assignee) if fm.assignee else None,
                                publication_date=str(fm.publication_date) if fm.publication_date else None,
                                family_id=str(fm.family_id) if fm.family_id else None,
                                cpc_codes=fm_cpc,
                                retrieval_sources=["family_expansion"],
                                raw_scores={"family_expansion": 0.85},
                                fused_score=0.0,
                                matched_elements=[],
                            )
                        )

                # Add cited documents
                raw_citations = cast(list[str], doc_entity.citations or [])
                for cited_id in raw_citations[:3]:
                    cited_doc = db.query(PatentDocument).filter(PatentDocument.id == cited_id).first()
                    if cited_doc:
                        citation_leads.append(str(cited_doc.id))
                        cd_cpc = cast(list[str], cited_doc.cpc_codes or [])
                        graph_expansion_docs.append(
                            RetrievedDocument(
                                doc_id=str(cited_doc.id),
                                publication_number=str(cited_doc.publication_number),
                                title=str(cited_doc.title),
                                snippet=str(cited_doc.abstract or "")[:300],
                                abstract=str(cited_doc.abstract) if cited_doc.abstract else None,
                                assignee=str(cited_doc.assignee) if cited_doc.assignee else None,
                                publication_date=str(cited_doc.publication_date) if cited_doc.publication_date else None,
                                family_id=str(cited_doc.family_id) if cited_doc.family_id else None,
                                cpc_codes=cd_cpc,
                                retrieval_sources=["citation_graph_expansion"],
                                raw_scores={"citation_expansion": 0.80},
                                fused_score=0.0,
                                matched_elements=[],
                            )
                        )

            if graph_expansion_docs:
                retrieved_pools.append(graph_expansion_docs)
                strategy_provenance.append({
                    "strategy": "GRAPH_FAMILY_EXPANSION",
                    "citation_leads_count": len(citation_leads),
                    "family_leads_count": len(family_leads),
                    "candidate_count": len(graph_expansion_docs),
                })

            # Final RRF merge
            all_fused = reciprocal_rank_fusion(retrieved_pools)

            # Rerank with Cohere / cross-encoder
            final_reranked = self.reranker.rerank(full_claim_text, all_fused, top_n=top_k)

            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "results": final_reranked,
                "limitation_gaps": limitation_gaps,
                "gap_summary": {
                    "total_limitations": len(decomposed_claim.elements),
                    "gaps_detected": len(gaps_detected),
                    "gaps_resolved": sum(1 for g in limitation_gaps if g["follow_up_dispatched"] and g["resolved_by_doc_id"]),
                },
                "strategy_provenance": strategy_provenance,
                "follow_up_queries": follow_up_log,
                "citation_leads_explored": list(dict.fromkeys(citation_leads)),
                "family_leads_explored": list(dict.fromkeys(family_leads)),
                "total_candidates_evaluated": len(all_fused),
                "execution_time_ms": elapsed_ms,
            }
        finally:
            if close_db:
                db.close()
