import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.core.config import settings
from backend.app.db.session import engine, Base, init_db
import backend.app.models.user
import backend.app.models.prediction
from backend.app.services.ml_service import ml_service

from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.dataset import router as dataset_router
from backend.app.api.v1.model import router as model_router
from backend.app.api.v1.predict import router as predict_router
from backend.app.api.v1.movement import router as movement_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("parkinsons_app")

# Ensure database tables exist immediately on import/startup
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info(f"ML Service Model Ready: {ml_service.is_ready()}")
    yield
    # Shutdown
    logger.info("Application shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Research & Educational Platform for Parkinson's Disease Dysphonia Acoustic Machine Learning Classification.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dataset_router, prefix=settings.API_V1_STR)
app.include_router(model_router, prefix=settings.API_V1_STR)
app.include_router(predict_router, prefix=settings.API_V1_STR)
app.include_router(movement_router, prefix=settings.API_V1_STR)

# Production Frontend Static Serving
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
            return {"error": "Not Found"}
        
        # Check if requesting a direct static file from dist root (e.g., favicon or vite.svg)
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        
        # Fallback to index.html for SPA client-side routing
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index_file)
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to the Parkinson's Disease Prediction & ML Research Platform API",
            "docs": "/docs",
            "health": f"{settings.API_V1_STR}/health"
        }

