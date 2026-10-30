import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Parkinson's Disease ML Research & Prediction Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "parkinsons-research-dev-secret-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database (Default: SQLite local database file; easily swapped to postgresql://...)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./parkinsons.db")
    
    # ML Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ML_ARTIFACTS_DIR: str = os.path.join(BASE_DIR, "..", "ml", "artifacts")
    ML_DATA_DIR: str = os.path.join(BASE_DIR, "..", "ml", "data")
    
    # Gemini AI API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

settings = Settings()

