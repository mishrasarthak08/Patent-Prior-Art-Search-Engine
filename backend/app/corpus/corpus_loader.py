import datetime
import os

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.corpus.battery_expansion import BATTERY_EXPANDED_PUBLICATIONS
from backend.app.corpus.expanded_corpus import EXPANDED_PATENT_CORPUS
from backend.app.db.models import PatentDocument, Project
from backend.app.db.session import SessionLocal

# Curated high-fidelity patent dataset with battery & energy storage expansion
_seen_ids = {p["id"] for p in EXPANDED_PATENT_CORPUS}
CURATED_PATENT_CORPUS = list(EXPANDED_PATENT_CORPUS) + [
    p for p in BATTERY_EXPANDED_PUBLICATIONS if p["id"] not in _seen_ids
]


def seed_corpus_and_database(db: Session | None = None) -> int:
    """
    Seeds the SQLite database and exports to Parquet for consistent dual-format availability.
    Creates default workspace/project if none exists.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        bind = db.get_bind()
        if bind and bind.dialect.name == "postgresql":
            from sqlalchemy import text
            db.execute(text("SELECT set_config('app.is_platform_admin', 'true', false);"))

        # Seed default project
        default_project = db.query(Project).filter(Project.id == "default-workspace").first()
        if not default_project:
            default_project = Project(
                id="default-workspace",
                name="Primary Prior-Art Research Workspace",
                matter_number="MATTER-2026-CORE",
                description="Default enterprise workspace for prior-art search, claim decomposition, and patent evidence charts.",
                client_name="Global Enterprise IP",
                created_at=datetime.datetime.utcnow(),
            )
            db.add(default_project)

        count = 0
        parquet_rows = []

        for p_data in CURATED_PATENT_CORPUS:
            existing = db.query(PatentDocument).filter(PatentDocument.id == p_data["id"]).first()
            if not existing:
                doc = PatentDocument(
                    id=p_data["id"],
                    publication_number=p_data["publication_number"],
                    country=p_data["country"],
                    title=p_data["title"],
                    abstract=p_data["abstract"],
                    claims_text="\n\n".join(p_data["claims_list"]),
                    claims_list=p_data["claims_list"],
                    description_text=str(p_data["description_text"]).strip(),
                    cpc_codes=p_data["cpc_codes"],
                    publication_date=p_data["publication_date"],
                    priority_date=p_data["priority_date"],
                    family_id=p_data["family_id"],
                    assignee=p_data["assignee"],
                    inventors=p_data["inventors"],
                    citations=p_data["citations"],
                    source_url=p_data["source_url"],
                    created_at=datetime.datetime.utcnow(),
                )
                db.add(doc)
                count += 1

            parquet_rows.append(
                {
                    "id": p_data["id"],
                    "title": p_data["title"],
                    "abstract": p_data["abstract"],
                    "claims": p_data["claims_list"],
                    "cpc_codes": p_data["cpc_codes"],
                    "publication_date": p_data["publication_date"],
                    "citations": p_data["citations"],
                    "family_id": p_data["family_id"],
                    "assignee": p_data["assignee"],
                    "description": str(p_data["description_text"]).strip(),
                }
            )

        db.commit()

        # Update Parquet file
        os.makedirs("data/corpus", exist_ok=True)
        df = pd.DataFrame(parquet_rows)
        df.to_parquet("data/corpus/corpus.parquet", index=False)

        return count
    finally:
        if close_db:
            db.close()
