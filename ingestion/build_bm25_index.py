import os
import pandas as pd
import pickle
from rank_bm25 import BM25Okapi
from typing import List


def tokenize_patent_text(text: str) -> List[str]:
    """
    Patent-aware tokenization: preserves chemical formulae, patent numbers,
    and hyphenated compound terms.
    """
    if not text:
        return []

    # Lowercase text
    text = text.lower()

    # Splitting by spaces
    tokens = text.split()
    clean_tokens = []
    for token in tokens:
        # Strip leading/trailing punctuation but keep internal hyphens, commas (for numbers)
        token = token.strip(".,;:!?()[]{}'\"")
        if token:
            clean_tokens.append(token)

    return clean_tokens


def build_bm25_index(
    parquet_path: str = "data/corpus/corpus.parquet",
    index_path: str = "data/corpus/bm25_index.pkl",
):
    if not os.path.exists(parquet_path):
        raise FileNotFoundError(
            f"Corpus file {parquet_path} not found. Run pull_corpus.py first."
        )

    print(f"Loading corpus from {parquet_path}...")
    df = pd.read_parquet(parquet_path)

    print("Tokenizing claims and abstracts...")
    tokenized_corpus = []
    doc_ids = []

    for _, row in df.iterrows():
        # Combine title, abstract, and claims for BM25 indexing
        claims_text = (
            " ".join(row["claims"])
            if row["claims"] is not None and len(row["claims"]) > 0
            else ""
        )
        text = f"{row['title']} {row['abstract']} {claims_text}"
        tokens = tokenize_patent_text(text)
        tokenized_corpus.append(tokens)
        doc_ids.append(row["id"])

    print(f"Building BM25 index for {len(tokenized_corpus)} documents...")
    bm25 = BM25Okapi(tokenized_corpus)

    index_data = {"bm25_model": bm25, "doc_ids": doc_ids}

    print(f"Saving index to {index_path}...")
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    with open(index_path, "wb") as f:
        pickle.dump(index_data, f)

    print("BM25 indexing complete.")


if __name__ == "__main__":
    build_bm25_index()
