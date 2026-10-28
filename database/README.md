# Database Configuration & Migrations

Relational schema management using **SQLAlchemy** and **Alembic**.

## Tables
- `users`: Researcher accounts with email, hashed password (bcrypt), and account timestamps.
- `prediction_records`: Historical inference records storing exact input features (JSON), prediction label, prediction text, confidence score, and optional researcher notes.

## Commands
```powershell
# Apply migrations to latest schema:
alembic upgrade head

# Generate a new migration after schema modification:
alembic revision --autogenerate -m "description_of_change"

# Seed default researcher account:
python database/seeds/seed_data.py
```

