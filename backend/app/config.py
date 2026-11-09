from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Environment & Application
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Patent Prior-Art Search Engine"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Security & Auth
    API_KEY: str = Field(default="dev_key", description="Master API Key for backend access")
    API_AUTH_TOKEN: str = Field(default="dev_key", description="Master API Auth Token")
    JWT_SECRET_KEY: str = Field(default="patent-engine-enterprise-secret-key-38491823901")
    ALLOWED_HOSTS: list[str] = ["*"]
    CORS_ORIGINS: list[str] = ["*"]
    CONFIDENTIAL_MODE: bool = Field(
        default=False, description="If True, hashes confidential claim text in logs and telemetry to prevent IP leaks"
    )

    # Database (PostgreSQL is production default with connection pooling)
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://patent_app_user:patent_app_secure_2026@localhost/patent_platform_pg",
        description="SQLAlchemy database connection URL",
    )

    # Qdrant Vector Store
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_URL: str | None = None
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "patent_claims"
    EMBEDDING_DIMENSION: int = 3072

    # LLM Providers
    GOOGLE_API_KEY: str | None = None
    GOOGLE_API_KEYS: str = ""
    COHERE_API_KEY: str | None = None

    # Search Defaults
    DEFAULT_RRF_K: int = 60
    DEFAULT_BM25_CANDIDATES: int = 50
    DEFAULT_DENSE_CANDIDATES_PER_ELEMENT: int = 15
    DEFAULT_FINAL_RETURN_COUNT: int = 10
    MAX_CLAIM_LENGTH: int = 10000

    # Transactional Email (SMTP / Spool)
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "noreply@patentsearchengine.com"
    SMTP_TLS: bool = True
    EMAIL_BACKEND: str = "spool"
    FRONTEND_URL: str = "http://localhost:3001"


settings = Settings()


def get_settings() -> Settings:
    return settings
