# Parkinson's Disease Prediction & ML Research Platform (NeuroVoice)

An educational and machine learning research platform demonstrating voice dysphonia feature engineering, participant data-leakage prevention, and multi-model classification for Parkinson's disease research.

> **Medical & Ethical Notice**: This software is an educational machine learning research prototype. Its outputs are experimental statistical classifications and **must not be used as a medical diagnosis device, clinical triage tool, or substitute for professional medical care**.

---

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router v6, MediaPipe Tasks Vision (`@mediapipe/tasks-vision`).
- **Live Movement Screening**: In-browser client-side 21-joint hand landmark and 33-joint pose landmark tracking running entirely locally on user GPU/WebGL. Zero video frames sent to servers.
- **Backend API**: Python FastAPI, Pydantic v2, Uvicorn, Bcrypt, Python-Jose (JWT).
- **Machine Learning**: Scikit-learn Pipeline (`StandardScaler` + `GradientBoostingClassifier`), Joblib.
- **Validation**: Subject-Grouped Cross-Validation (`GroupShuffleSplit` + `StratifiedGroupKFold`) strictly preventing participant data leakage across repeated recordings.
- **Database**: SQLite (SQLAlchemy ORM + Alembic migrations). PostgreSQL connection string compatible.

---

## Quick Start on Windows

### 1. Setup Environment
```powershell
# Create Python virtual environment:
python -m venv .venv

# Install Python requirements:
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# Install Node dependencies:
cd frontend
npm.cmd install
cd ..
```

### 2. Prepare Data & Train Models
```powershell
# Download official UCI Parkinson's dataset:
.\.venv\Scripts\python.exe ml/scripts/download_dataset.py

# Train models and export fitted pipeline artifact:
.\.venv\Scripts\python.exe ml/scripts/train_models.py

# Apply database migrations and seed demo researcher account:
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe database/seeds/seed_data.py
```

### 3. Run Automated Tests
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

### 4. Start the Application (Unified Production Mode)

Run the single unified production server serving both the compiled web interface and the REST API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

- **Application Web UI**: [http://localhost:8000/](http://localhost:8000/)
- **Live Movement Screening Module**: [http://localhost:8000/movement](http://localhost:8000/movement)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Telemetry**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

*(Optional Frontend Dev Mode with Hot Reloading)*:
```powershell
cd frontend
npm.cmd run dev
```

---

## Default Demo Researcher Credentials
- **Email**: `researcher@neurovoice.org`
- **Password**: `NeuroResearch2026!`

---

## Documentation Links
- [System Architecture](docs/architecture.md)
- [Dataset Documentation](docs/dataset-documentation.md)
- [Model Card & Evaluation](docs/model-card.md)
- [API Documentation](docs/api-documentation.md)
- [Automated Testing Report](docs/testing-report.md)
- [Windows Setup Guide](docs/setup-guide.md)

