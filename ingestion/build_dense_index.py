import os
import pandas as pd
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from uuid import uuid4

# Load environment variables (e.g. OPENAI_API_KEY)
load_dotenv()

def build_dense_index(parquet_path: str = 'data/corpus/corpus.parquet'):
    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Corpus file {parquet_path} not found. Run pull_corpus.py first.")
        
    print(f"Loading corpus from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    
    # Initialize Qdrant Client
    qdrant_host = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))
    client = QdrantClient(host=qdrant_host, port=qdrant_port)
    
    collection_name = "patent_claims"
    
    # Initialize Embeddings
    print("Initializing OpenAI embeddings...")
    embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Recreate collection
    try:
        client.delete_collection(collection_name=collection_name)
    except Exception:
        pass
        
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    )
    
    points = []
    
    print("Processing and chunking documents...")
    # Chunking strategy: 1 vector per claim, 1 vector for abstract
    for _, row in df.iterrows():
        doc_id = row['id']
        cpc_codes = list(row['cpc_codes']) if row['cpc_codes'] is not None else []
        pub_date = str(row['publication_date'])
        
        # Abstract
        if row['abstract']:
            points.append(
                {
                    "text": row['abstract'],
                    "metadata": {
                        "doc_id": doc_id,
                        "type": "abstract",
                        "cpc_codes": cpc_codes,
                        "publication_date": pub_date
                    }
                }
            )
            
        # Claims
        if row['claims']:
            for i, claim in enumerate(row['claims']):
                points.append(
                    {
                        "text": claim,
                        "metadata": {
                            "doc_id": doc_id,
                            "type": "claim",
                            "claim_index": i,
                            "cpc_codes": cpc_codes,
                            "publication_date": pub_date
                        }
                    }
                )
                
    print(f"Generated {len(points)} chunks. Embedding and upserting in batches...")
    
    # Process in batches
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        texts = [p["text"] for p in batch]
        metadatas = [p["metadata"] for p in batch]
        
        # Embed
        vectors = embeddings_model.embed_documents(texts)
        
        # Prepare points
        qdrant_points = [
            PointStruct(
                id=str(uuid4()),
                vector=vector,
                payload={"text": text, **metadata}
            )
            for text, vector, metadata in zip(texts, vectors, metadatas)
        ]
        
        # Upsert
        client.upsert(
            collection_name=collection_name,
            points=qdrant_points
        )
        print(f"Upserted batch {i // batch_size + 1} / {(len(points) + batch_size - 1) // batch_size}")
        
    print("Dense indexing complete.")

if __name__ == "__main__":
    build_dense_index()
