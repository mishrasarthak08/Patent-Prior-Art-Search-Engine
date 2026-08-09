import math
from typing import List, Set


def recall_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int) -> float:
    if not gold_ids:
        return 0.0
    retrieved_k = retrieved_ids[:k]
    relevant_retrieved = len(set(retrieved_k).intersection(gold_ids))
    return relevant_retrieved / len(gold_ids)


def precision_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int) -> float:
    if k == 0:
        return 0.0
    retrieved_k = retrieved_ids[:k]
    if not retrieved_k:
        return 0.0
    relevant_retrieved = len(set(retrieved_k).intersection(gold_ids))
    return relevant_retrieved / len(retrieved_k)


def mrr(retrieved_ids: List[str], gold_ids: Set[str]) -> float:
    for i, doc_id in enumerate(retrieved_ids):
        if doc_id in gold_ids:
            return 1.0 / (i + 1)
    return 0.0


def dcg_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int) -> float:
    dcg = 0.0
    for i, doc_id in enumerate(retrieved_ids[:k]):
        if doc_id in gold_ids:
            dcg += 1.0 / math.log2(i + 2)  # i=0 -> log2(2) = 1
    return dcg


def ndcg_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int) -> float:
    actual_dcg = dcg_at_k(retrieved_ids, gold_ids, k)

    # Ideal DCG (if all gold documents were ranked at the very top)
    ideal_retrieved = list(gold_ids)[:k]
    ideal_dcg = dcg_at_k(ideal_retrieved, gold_ids, k)

    if ideal_dcg == 0.0:
        return 0.0
    return actual_dcg / ideal_dcg
