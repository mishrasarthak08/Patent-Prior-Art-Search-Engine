from typing import Protocol

from backend.app.schemas import RetrievedDocument


class Retriever(Protocol):
    def search(self, query: str, k: int, filters: dict | None = None) -> list[RetrievedDocument]: ...


class Reranker(Protocol):
    def rerank(self, query: str, candidates: list[RetrievedDocument], top_n: int) -> list[RetrievedDocument]: ...
