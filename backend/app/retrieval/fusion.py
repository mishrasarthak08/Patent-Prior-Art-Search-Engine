
from backend.app.schemas import RetrievedDocument


def reciprocal_rank_fusion(
    lists_of_docs: list[list[RetrievedDocument]], k_rrf: int = 60
) -> list[RetrievedDocument]:
    """
    Implements Reciprocal Rank Fusion from scratch.
    RRF_score = sum(1 / (k_rrf + rank)) across all lists.
    """
    rrf_scores: dict[str, float] = {}
    doc_registry: dict[str, RetrievedDocument] = {}

    for doc_list in lists_of_docs:
        for rank, doc in enumerate(doc_list):
            doc_id = doc.doc_id
            score = 1.0 / (k_rrf + rank + 1)  # rank is 0-indexed, usually we add 1

            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = 0.0
                # Initialize an aggregated document
                doc_registry[doc_id] = RetrievedDocument(
                    doc_id=doc_id,
                    title=doc.title,
                    snippet=doc.snippet,
                    retrieval_sources=list(doc.retrieval_sources),
                    raw_scores=dict(doc.raw_scores),
                    fused_score=0.0,
                    matched_elements=list(doc.matched_elements),
                )

            rrf_scores[doc_id] += score

            # Merge sources, raw scores, and matched elements
            if doc_id in doc_registry and doc_registry[doc_id] is not doc:
                reg_doc = doc_registry[doc_id]
                for source in doc.retrieval_sources:
                    if source not in reg_doc.retrieval_sources:
                        reg_doc.retrieval_sources.append(source)
                reg_doc.raw_scores.update(doc.raw_scores)
                for element in doc.matched_elements:
                    if element not in reg_doc.matched_elements:
                        reg_doc.matched_elements.append(element)

    # Apply fused scores and sort
    fused_docs = []
    for doc_id, score in rrf_scores.items():
        doc = doc_registry[doc_id]
        doc.fused_score = score
        fused_docs.append(doc)

    fused_docs.sort(key=lambda d: d.fused_score, reverse=True)
    return fused_docs
