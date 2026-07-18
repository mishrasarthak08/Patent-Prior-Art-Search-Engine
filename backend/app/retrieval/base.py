from typing import Protocol, List, Optional, Dict
from backend.app.schemas import RetrievedDocument

class Retriever(Protocol):
    def search(self, query: str, k: int, filters: Optional[Dict] = None) -> List[RetrievedDocument]:
        ...

class Reranker(Protocol):
    def rerank(self, query: str, candidates: List[RetrievedDocument], top_n: int) -> List[RetrievedDocument]:
        ...
