import os
import json
import pandas as pd
from google.cloud import bigquery
from typing import List, Optional
from pydantic import BaseModel

# Defines the canonical PatentDocument model
class PatentDocument(BaseModel):
    id: str
    title: str
    abstract: str
    claims: List[str]
    cpc_codes: List[str]
    publication_date: str
    citations: List[str]

def pull_corpus(limit: int = 5000, cpc_subclass: str = 'H01M'):
    """
    Pulls patent documents from BigQuery patents-public-data.
    Requires Google Cloud credentials.
    Using a smaller limit (5000) for testing to reduce time/cost, 
    but can be expanded to 50k-150k as per spec.
    """
    client = bigquery.Client()
    
    # Query to fetch a bounded set of patents from a specific CPC class
    query = f"""
        SELECT 
            p.publication_number AS id,
            ANY_VALUE(p.title_localized[SAFE_OFFSET(0)].text) AS title,
            ANY_VALUE(p.abstract_localized[SAFE_OFFSET(0)].text) AS abstract,
            ANY_VALUE(p.claims_localized[SAFE_OFFSET(0)].text) AS claims_text,
            ANY_VALUE(p.publication_date) AS publication_date,
            ARRAY_AGG(DISTINCT cpc.code IGNORE NULLS) AS cpc_codes,
            ARRAY_AGG(DISTINCT cit.publication_number IGNORE NULLS) AS citations
        FROM 
            `patents-public-data.patents.publications` p
        LEFT JOIN UNNEST(p.cpc) AS cpc
        LEFT JOIN UNNEST(p.citation) AS cit
        WHERE 
            cpc.code LIKE '{cpc_subclass}%'
            AND p.country_code = 'US'
            AND ARRAY_LENGTH(p.claims_localized) > 0
            AND ARRAY_LENGTH(p.abstract_localized) > 0
        GROUP BY 
            p.publication_number
        LIMIT {limit}
    """
    
    print(f"Fetching up to {limit} patents for CPC subclass {cpc_subclass}...")
    query_job = client.query(query)
    results = query_job.result()
    
    docs = []
    citation_pairs = []
    
    for row in results:
        claims_text = row.claims_text or ""
        # Basic split - full patent text processing can be more robust
        claims = [c.strip() for c in claims_text.split('\n') if c.strip()]
        
        cpc_codes = list(row.cpc_codes) if row.cpc_codes else []
        citations = list(row.citations) if row.citations else []
        
        doc = PatentDocument(
            id=row.id,
            title=row.title or "",
            abstract=row.abstract or "",
            claims=claims,
            cpc_codes=cpc_codes,
            publication_date=str(row.publication_date),
            citations=citations
        )
        docs.append(doc.model_dump())
        
        if citations:
            citation_pairs.append({
                "source": row.id,
                "targets": citations
            })
            
    df = pd.DataFrame(docs)
    os.makedirs('data/corpus', exist_ok=True)
    df.to_parquet('data/corpus/corpus.parquet', index=False)
    print(f"Saved {len(df)} documents to data/corpus/corpus.parquet")
    
    os.makedirs('eval', exist_ok=True)
    with open('eval/citation_pairs.json', 'w') as f:
        json.dump(citation_pairs, f, indent=2)
    print(f"Saved citation pairs for {len(citation_pairs)} patents to eval/citation_pairs.json")

if __name__ == "__main__":
    # Ensure ADC (Application Default Credentials) are set
    pull_corpus(limit=5000, cpc_subclass='H01M')
