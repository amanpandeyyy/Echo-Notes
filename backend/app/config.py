import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
EXPORTS_DIR = BASE_DIR / "exports"
CHROMA_DIR = BASE_DIR / "chroma_db"

for d in [DATA_DIR, UPLOADS_DIR, EXPORTS_DIR, CHROMA_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "Echo-Notes"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Storage Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    EXPORTS_DIR: Path = EXPORTS_DIR
    CHROMA_DIR: Path = CHROMA_DIR
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'echo_notes.db'}"

    # API Keys (Loaded from .env, env vars, or configured via in-app UI)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    SARVAM_API_KEY: Optional[str] = os.getenv("SARVAM_API_KEY", "")
    MISTRAL_API_KEY: Optional[str] = os.getenv("MISTRAL_API_KEY", "")
    HUGGINGFACE_API_KEY: Optional[str] = os.getenv("HUGGINGFACE_API_KEY", os.getenv("HF_TOKEN", ""))

    # Models
    MISTRAL_MODEL: str = "open-mistral-nemo"
    WHISPER_MODEL: str = "whisper-1"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

