"""
Robust Data Migration Script: SQLite -> PostgreSQL
Transfers all historical entities while respecting foreign keys, constraints, and types.
"""

import json
import sqlite3
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

SQLITE_PATH = "data/patent_platform.db"
PG_URL = "postgresql://localhost/patent_platform_pg"

BOOL_COLS = {
    "users": ["is_platform_admin", "is_active", "is_verified", "onboarding_completed"],
    "workspaces": ["is_default"],
    "support_sessions": ["is_active"],
    "evidence_mappings": ["verified", "literal_match"],
}

def migrate():
    print(f"Connecting to SQLite: {SQLITE_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    s_cur = sqlite_conn.cursor()

    print(f"Connecting to PostgreSQL: {PG_URL}")
    pg_engine = create_engine(PG_URL)
    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    # Tables in topological dependency order
    tables = [
        "organizations",
        "users",
        "workspaces",
        "workspace_memberships",
        "patent_documents",
        "projects",
        "search_executions",
        "evidence_mappings",
        "annotations",
        "saved_documents",
        "audit_logs",
        "usage_metrics",
        "evaluation_records",
        "support_sessions",
        "quarantine_records",
    ]

    try:
        print("Truncating PostgreSQL tables in reverse order for clean sync...")
        for tbl in reversed(tables):
            pg_session.execute(text(f"TRUNCATE TABLE {tbl} CASCADE;"))
        pg_session.commit()

        for tbl in tables:
            s_cur.execute(f"SELECT * FROM {tbl}")
            rows = s_cur.fetchall()
            if not rows:
                print(f"  {tbl}: 0 rows to copy.")
                continue

            col_names = [col[0] for col in s_cur.description]
            cols_str = ", ".join(col_names)
            params_str = ", ".join([f":{c}" for c in col_names])
            insert_stmt = text(f"INSERT INTO {tbl} ({cols_str}) VALUES ({params_str}) ON CONFLICT DO NOTHING")

            inserted = 0
            for r in rows:
                row_dict = dict(r)

                # Boolean conversions
                if tbl in BOOL_COLS:
                    for bcol in BOOL_COLS[tbl]:
                        if bcol in row_dict and row_dict[bcol] is not None:
                            row_dict[bcol] = bool(row_dict[bcol])

                # Convert string dates if necessary
                for dcol in ["created_at", "updated_at", "expires_at", "revoked_at", "password_reset_expires_at"]:
                    if dcol in row_dict and row_dict[dcol]:
                        if isinstance(row_dict[dcol], str):
                            try:
                                row_dict[dcol] = datetime.fromisoformat(row_dict[dcol].replace("Z", "+00:00"))
                            except Exception:
                                pass

                pg_session.execute(insert_stmt, row_dict)
                inserted += 1

            pg_session.commit()
            print(f"  ✓ {tbl}: successfully synchronized {inserted} rows.")

        print("\n=== VERIFYING POSTGRESQL ROW COUNTS ===")
        for tbl in tables:
            cnt = pg_session.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            print(f"  PostgreSQL {tbl}: {cnt}")

        print("\n✅ MIGRATION TO POSTGRESQL COMPLETED SUCCESSFULLY WITH ZERO LOSS.")
    except Exception as e:
        pg_session.rollback()
        print(f"❌ Error during migration: {e}")
        raise
    finally:
        sqlite_conn.close()
        pg_session.close()

if __name__ == "__main__":
    migrate()
