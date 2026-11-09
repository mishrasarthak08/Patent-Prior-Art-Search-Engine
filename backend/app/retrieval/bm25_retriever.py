import logging
import re

from rank_bm25 import BM25Okapi

from backend.app.db.models import PatentDocument
from backend.app.db.session import SessionLocal
from backend.app.schemas import RetrievedDocument, SearchFilterParams

logger = logging.getLogger(__name__)


def tokenize_patent_text(text: str) -> list[str]:
    """
    Patent-aware tokenizer: preserves chemical formulas, compound terms,
    alphanumeric identifiers (e.g. LiNi0.8Co0.1Mn0.1O2, PVDF-HFP, ReRAM),
    and removes standard generic stopwords while preserving technical tokens.
    """
    if not text:
        return []
    text = text.lower()
    # Normalize punctuation but retain internal hyphens and decimals for chemical/numeric formulas
    tokens = re.findall(r"\b[a-z0-9]+(?:[\.\-][a-z0-9]+)*\b", text)
    stopwords = {
        "the",
        "a",
        "an",
        "and",
        "or",
        "in",
        "of",
        "to",
        "for",
        "with",
        "on",
        "at",
        "from",
        "by",
        "as",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "which",
        "wherein",
        "said",
        "comprising",
        "comprises",
        "thereof",
        "having",
        "configured",
    }
    return [t for t in tokens if t not in stopwords and len(t) > 1]


class BM25Retriever:
    def __init__(self):
        self.doc_registry = {}
        self.bm25_model = None
        self.doc_ids = []
        self._load_corpus()

    def _load_corpus(self):
        db = SessionLocal()
        try:
            docs = db.query(PatentDocument).all()
            if not docs:
                logger.warning("No documents found in database for BM25 indexing.")
                return

            tokenized_corpus = []
            self.doc_ids = []
            self.doc_registry = {}

            for doc in docs:
                self.doc_registry[doc.id] = {
                    "id": doc.id,
                    "publication_number": doc.publication_number,
                    "country": doc.country,
                    "title": doc.title,
                    "abstract": doc.abstract or "",
                    "claims_text": doc.claims_text or "",
                    "description": doc.description_text or "",
                    "cpc_codes": doc.cpc_codes or [],
                    "publication_date": doc.publication_date or "",
                    "family_id": doc.family_id or doc.id,
                    "assignee": doc.assignee or "Unknown",
                }

                # Field weighted tokenization: Title x3, Abstract x2, Claims x2.5, Description x1
                title_str = str(doc.title or "")
                abstract_str = str(doc.abstract or "")
                claims_str = str(doc.claims_text or "")
                desc_str = str(doc.description_text or "")[:1500]

                title_tokens = tokenize_patent_text(title_str) * 3
                abstract_tokens = tokenize_patent_text(abstract_str) * 2
                claims_tokens = tokenize_patent_text(claims_str) * 2
                desc_tokens = tokenize_patent_text(desc_str)

                combined_tokens = title_tokens + abstract_tokens + claims_tokens + desc_tokens
                tokenized_corpus.append(combined_tokens)
                self.doc_ids.append(doc.id)

            if tokenized_corpus:
                self.bm25_model = BM25Okapi(tokenized_corpus)
                logger.info(f"Built BM25 index with {len(self.doc_ids)} documents.")
        finally:
            db.close()

    def _matches_filters(self, doc_data: dict, filters: SearchFilterParams | None) -> bool:
        if not filters:
            return True

        # CPC filter
        if filters.cpc_codes:
            doc_cpcs = doc_data.get("cpc_codes", [])
            matched = False
            for target_cpc in filters.cpc_codes:
                target_clean = target_cpc.strip().upper()
                if any(cpc.upper().startswith(target_clean) for cpc in doc_cpcs):
                    matched = True
                    break
            if not matched:
                return False

        # Date range filter
        pub_date = doc_data.get("publication_date", "")
        if filters.date_from and pub_date and pub_date < filters.date_from:
            return False
        if filters.date_to and pub_date and pub_date > filters.date_to:
            return False

        # Jurisdiction filter
        if filters.jurisdiction:
            country = doc_data.get("country", "")
            if country.upper() != filters.jurisdiction.upper():
                return False

        return True

    def search(self, query: str, k: int = 50, filters: SearchFilterParams | None = None) -> list[RetrievedDocument]:
        if not self.bm25_model or not self.doc_ids:
            self._load_corpus()
            if not self.bm25_model:
                return []

        tokenized_query = tokenize_patent_text(query)
        if not tokenized_query:
            return []

        scores = self.bm25_model.get_scores(tokenized_query)
        sorted_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)

        results: list[RetrievedDocument] = []
        seen_families = set()

        for idx in sorted_indices:
            score = scores[idx]
            if score <= 0:
                continue

            doc_id = self.doc_ids[idx]
            doc_data = self.doc_registry.get(doc_id)
            if not doc_data:
                continue

            # Apply filters
            if not self._matches_filters(doc_data, filters):
                continue

            # Apply family deduplication if requested
            if filters and filters.deduplicate_families:
                fam_id = doc_data.get("family_id")
                if fam_id in seen_families:
                    continue
                seen_families.add(fam_id)

            # Extract representative passage snippet
            snippet = doc_data["abstract"] or doc_data["claims_text"][:350]
            if len(snippet) > 350:
                snippet = snippet[:350] + "..."

            results.append(
                RetrievedDocument(
                    doc_id=doc_id,
                    publication_number=doc_data.get("publication_number", doc_id),
                    title=doc_data["title"],
                    snippet=snippet,
                    abstract=doc_data.get("abstract"),
                    assignee=doc_data.get("assignee"),
                    publication_date=doc_data.get("publication_date"),
                    family_id=doc_data.get("family_id"),
                    cpc_codes=doc_data.get("cpc_codes", []),
                    retrieval_sources=["bm25"],
                    raw_scores={"bm25": float(score)},
                    fused_score=0.0,
                    matched_elements=[],
                )
            )

            if len(results) >= k:
                break

        return results
