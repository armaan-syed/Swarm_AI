"""Application configuration loaded from environment variables."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Agentic AI Base"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # LLM - Ollama (default, local & free)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    LLM_TEMPERATURE: float = 0.2

    # LLM - Groq (optional fallback, free tier API)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Auth
    JWT_ALGORITHM: str = "HS256"

    # Scheduler (RBI/SEBI/MCA source monitoring)
    SCHEDULER_ENABLED: bool = True
    MONITOR_INTERVAL_HOURS: int = 10
    MONITOR_MAX_DOCS: int = 5

    # ChromaDB (vector store for embeddings + semantic search)
    CHROMA_PERSIST_DIR: str = "./chroma_store"
    CHROMA_COMPANY_COLLECTION: str = "company_documents"
    CHROMA_CIRCULAR_COLLECTION: str = "regulatory_circulars"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
