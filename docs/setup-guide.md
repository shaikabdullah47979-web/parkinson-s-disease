# Beginner-Friendly Windows Setup & Operation Guide

This guide provides exact, step-by-step PowerShell instructions to run, test, and develop the application on a Windows computer.

---

## Prerequisites Check

Open Windows PowerShell and check your installed tools:

```powershell
python --version
node -v
npm.cmd -v
git --version
```

---

## 1. Environment Setup

### Create and Activate Virtual Environment

```powershell
# In the project root directory:
python -m venv .venv

# Activate the virtual environment:
.\.venv\Scripts\Activate.ps1
```

### Install Backend & ML Dependencies

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

### Install Frontend Dependencies

```powershell
cd frontend
npm.cmd install
cd ..
```

---

## 2. Dataset Download & Model Training

Execute the automated data acquisition and model training scripts:

```powershell
# 1. Download and verify official UCI Parkinson's dataset:
.\.venv\Scripts\python.exe ml/scripts/download_dataset.py

# 2. Inspect dataset and generate documentation:
.\.venv\Scripts\python.exe ml/scripts/inspect_dataset.py

# 3. Train candidate models and evaluate using subject-grouped cross-validation:
.\.venv\Scripts\python.exe ml/scripts/train_models.py
```

---

## 3. Database Migrations

Apply Alembic migrations to set up the relational database:

```powershell
# Apply database schema migrations:
.\.venv\Scripts\alembic.exe upgrade head

# Seed demo researcher account (researcher@neurovoice.org / NeuroResearch2026!):
.\.venv\Scripts\python.exe database/seeds/seed_data.py
```

---

## 4. Running the Application (Live Production Server)

Start the unified production server serving both the web application and API on a single port:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

- **Web Application**: `http://localhost:8000/`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **Health Telemetry**: `http://localhost:8000/api/v1/health`

Open your web browser and navigate to `http://localhost:8000/`.

---

## 5. Running Automated Tests

Run the complete test suite (both ML pipeline integrity tests and backend API tests):

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

All 13 tests should pass.

