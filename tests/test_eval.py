from eval.metrics import mrr, ndcg_at_k, precision_at_k, recall_at_k


def test_precision():
    ret = ["A", "B", "C", "D"]
    gold = {"B", "C"}
    assert precision_at_k(ret, gold, 2) == 0.5  # B is relevant (1/2)
    assert precision_at_k(ret, gold, 4) == 0.5  # B, C relevant (2/4)


def test_recall():
    ret = ["A", "B", "C", "D"]
    gold = {"B", "C", "Z"}
    assert recall_at_k(ret, gold, 4) == 2.0 / 3.0


def test_mrr():
    ret = ["A", "B", "C", "D"]
    gold = {"C", "D"}
    # First relevant is C at index 2 (rank 3)
    assert mrr(ret, gold) == 1.0 / 3.0


def test_ndcg():
    ret = ["A", "B"]
    gold = {"B"}
    # rank 2 is relevant.
    # DCG = 1 / log2(3) ~ 0.63
    # Ideal DCG = 1 / log2(2) = 1.0
    # nDCG ~ 0.63
    ndcg = ndcg_at_k(ret, gold, 2)
    assert round(ndcg, 2) == 0.63
