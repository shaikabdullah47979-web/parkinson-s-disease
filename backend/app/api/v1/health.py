from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.services.ml_service import ml_service

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ml_model_ready": ml_service.is_ready(),
        "database": "sqlite_connected" if settings.DATABASE_URL.startswith("sqlite") else "postgresql_configured"
    }

