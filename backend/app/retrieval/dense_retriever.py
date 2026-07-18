import os
from typing import List, Optional, Dict
from qdrant_client import QdrantClient
from langchain_openai import OpenAIEmbeddings
from backend.app.schemas import RetrievedDocument

class DenseRetriever:
    def __init__(self, collection_name: str = "patent_claims"):
        self.collection_name = collection_name
        qdrant_host = os.getenv("QDRANT_HOST", "localhost")
        qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))
        self.client = QdrantClient(host=qdrant_host, port=qdrant_port)
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    def search(self, query: str, k: int, filters: Optional[Dict] = None) -> List[RetrievedDocument]:
        # Embed query
        query_vector = self.embeddings.embed_query(query)
        
        # We can add Qdrant filters based on CPC/Date here if passed
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=k,
            with_payload=True
        )
        
        results = []
        for scored_point in search_result:
            payload = scored_point.payload or {}
            doc_id = payload.get("doc_id", "unknown")
            text = payload.get("text", "")
            
            doc = RetrievedDocument(
                doc_id=doc_id,
                title=f"Unknown Title (Dense: {payload.get('type')})", 
                snippet=text[:200] + "...",
                retrieval_sources=["dense"],
                raw_scores={"dense": float(scored_point.score)},
                fused_score=0.0,
                matched_elements=[]
            )
            results.append(doc)
            
        return results

class HydeDenseRetriever(DenseRetriever):
    def search(self, query: str, k: int, filters: Optional[Dict] = None) -> List[RetrievedDocument]:
        results = super().search(query, k, filters)
        for doc in results:
            doc.retrieval_sources = ["hyde"]
            doc.raw_scores = {"hyde": doc.raw_scores.get("dense", 0.0)}
        return results
