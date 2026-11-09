import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.config import settings

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

connect_args = {}
engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # Production PostgreSQL Connection Pooling
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 1800
    engine_kwargs["pool_timeout"] = 30

engine = create_engine(
    db_url,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend.app.db.models import Base as ModelsBase
    ModelsBase.metadata.create_all(bind=engine)

    # In PostgreSQL, automatically apply kernel-level Row Level Security policies
    if engine.dialect.name == "postgresql":
        rls_sql_path = os.path.join(os.path.dirname(__file__), "postgresql_rls.sql")
        if os.path.exists(rls_sql_path):
            try:
                from sqlalchemy import text
                with engine.begin() as conn:
                    with open(rls_sql_path, "r", encoding="utf-8") as f:
                        sql_content = f.read()
                    for stmt in sql_content.split(";"):
                        stmt_clean = stmt.strip()
                        if stmt_clean:
                            try:
                                conn.execute(text(stmt_clean))
                            except Exception:
                                pass
            except Exception:
                pass
    # Check and run lightweight SQLite column migrations if needed
    if settings.DATABASE_URL.startswith("sqlite"):
        import sqlite3

        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cols = [
                ("projects", "org_id VARCHAR(36)"),
                ("projects", "workspace_id VARCHAR(36)"),
                ("projects", 'status VARCHAR(50) DEFAULT "ACTIVE"'),
                ("projects", 'jurisdiction VARCHAR(20) DEFAULT "US"'),
                ("projects", 'technical_domain VARCHAR(100) DEFAULT "General"'),
                ("projects", "assigned_to_user_id VARCHAR(36)"),
                ("projects", "notes TEXT"),
                ("evidence_mappings", 'attorney_review_status VARCHAR(50) DEFAULT "PENDING"'),
                ("evidence_mappings", "attorney_notes TEXT"),
                ("users", "is_platform_admin BOOLEAN DEFAULT 0"),
                ("users", "is_verified BOOLEAN DEFAULT 1"),
                ("users", 'status VARCHAR(50) DEFAULT "ACTIVE"'),
                ("users", "verification_token VARCHAR(255)"),
                ("users", "password_reset_token VARCHAR(255)"),
                ("users", "password_reset_expires_at DATETIME"),
            ]
            for table, col_def in cols:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
                except Exception:
                    pass
            conn.commit()
            conn.close()
            conn.close()
