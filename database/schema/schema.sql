-- Relational Schema Definition for Parkinson's Disease Platform

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS prediction_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    model_name VARCHAR(100) NOT NULL,
    input_features JSON NOT NULL,
    prediction_label INTEGER NOT NULL, -- 0 (Healthy) or 1 (Parkinson's Dysphonia)
    prediction_text VARCHAR(100) NOT NULL,
    confidence_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(500),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_prediction_records_user_id ON prediction_records(user_id);
CREATE INDEX IF NOT EXISTS ix_prediction_records_created_at ON prediction_records(created_at);

