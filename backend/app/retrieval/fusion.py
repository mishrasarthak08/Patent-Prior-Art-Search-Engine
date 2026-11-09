from backend.app.schemas import RetrievedDocument


def reciprocal_rank_fusion(
    lists_of_docs: list[list[RetrievedDocument]],
    k_rrf: int = 60,
    weights: list[float] | None = None,
) -> list[RetrievedDocument]:
    """
    Implements Weighted Reciprocal Rank Fusion with robust deduplication,
    provenance tracking, and normalized composite ranking scores.

    RRF_score(d) = sum_m( w_m / (k_rrf + rank_m(d) + 1) )
    """
    rrf_scores: dict[str, float] = {}
    doc_registry: dict[str, RetrievedDocument] = {}

    if not lists_of_docs:
        return []

    if weights is None or len(weights) != len(lists_of_docs):
        weights = [1.0] * len(lists_of_docs)

    for list_idx, doc_list in enumerate(lists_of_docs):
        list_weight = weights[list_idx]
        for rank, doc in enumerate(doc_list):
            doc_id = doc.doc_id
            score = list_weight / (k_rrf + rank + 1)

            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = 0.0
                doc_registry[doc_id] = RetrievedDocument(
                    doc_id=doc.doc_id,
                    publication_number=doc.publication_number or doc.doc_id,
                    title=doc.title,
                    snippet=doc.snippet,
                    abstract=doc.abstract,
                    assignee=doc.assignee,
                    publication_date=doc.publication_date,
                    family_id=doc.family_id,
                    cpc_codes=list(doc.cpc_codes or []),
                    retrieval_sources=list(doc.retrieval_sources),
                    raw_scores=dict(doc.raw_scores),
                    fused_score=0.0,
                    matched_elements=list(doc.matched_elements),
                )

            rrf_scores[doc_id] += score

            # Merge sources, scores, and matched limitation elements
            reg_doc = doc_registry[doc_id]
            for src in doc.retrieval_sources:
                if src not in reg_doc.retrieval_sources:
                    reg_doc.retrieval_sources.append(src)
            reg_doc.raw_scores.update(doc.raw_scores)
            for elem_id in doc.matched_elements:
                if elem_id not in reg_doc.matched_elements:
                    reg_doc.matched_elements.append(elem_id)

    if not rrf_scores:
        return []

    # Normalize fused scores so highest document is 1.0 (or normalized relative to max theoretical score)
    max_score = max(rrf_scores.values()) if rrf_scores else 1.0

    fused_docs: list[RetrievedDocument] = []
    for doc_id, raw_rrf in rrf_scores.items():
        doc = doc_registry[doc_id]
        doc.fused_score = round(raw_rrf / max_score if max_score > 0 else raw_rrf, 4)
        fused_docs.append(doc)

    fused_docs.sort(key=lambda d: d.fused_score, reverse=True)
    return fused_docs
