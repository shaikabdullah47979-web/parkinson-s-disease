# NeuroVoice Backend API

High-performance REST API built with:
- **FastAPI**
- **Pydantic v2** validation with strict ranges and alias support for biomedical column names
- **SQLAlchemy 2.0** ORM
- **Alembic** migrations
- **Bcrypt** & **Python-Jose** for JWT researcher authentication
- **Joblib** for model pipeline inference

## Key Endpoints
- `GET /api/v1/health`: System health and model availability
- `GET /api/v1/dataset/status`: UCI dataset overview
- `GET /api/v1/dataset/features`: 22 acoustic features specifications
- `GET /api/v1/model/status`: Active model pipeline status
- `GET /api/v1/model/metrics`: Held-out test performance and feature importance
- `POST /api/v1/predict`: Execute inference pipeline on 22 acoustic features
- `POST /api/v1/auth/register` & `/login`: JWT user authentication
- `GET /api/v1/predictions`: Prediction audit logs

## Development Commands
```powershell
# Start Uvicorn development server
..\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000

# Run API tests
..\.venv\Scripts\python.exe -m pytest backend/tests/test_api.py -v
```

