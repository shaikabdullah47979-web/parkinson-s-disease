"""
Automated unit and integration tests for dataset integrity and ML artifacts.
"""

import os
import json
import pytest
import pandas as pd
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "parkinsons.data")
METADATA_PATH = os.path.join(BASE_DIR, "data", "raw", "dataset_metadata.json")
MODEL_PATH = os.path.join(BASE_DIR, "artifacts", "best_model.joblib")
MODEL_CARD_PATH = os.path.join(BASE_DIR, "artifacts", "model_card.json")

EXPECTED_FEATURE_COUNT = 22
EXPECTED_COLUMNS = [
    "name", "MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)", "MDVP:Jitter(%)",
    "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ", "Jitter:DDP", "MDVP:Shimmer",
    "MDVP:Shimmer(dB)", "Shimmer:APQ3", "Shimmer:APQ5", "MDVP:APQ", "Shimmer:DDA",
    "NHR", "HNR", "status", "RPDE", "DFA", "spread1", "spread2", "D2", "PPE"
]

FEATURE_COLUMNS = [c for c in EXPECTED_COLUMNS if c not in ["name", "status"]]

def test_dataset_file_exists():
    assert os.path.exists(DATA_PATH), f"Raw dataset missing at {DATA_PATH}"
    assert os.path.getsize(DATA_PATH) > 0, "Dataset file is empty"

def test_dataset_structure_and_types():
    df = pd.read_csv(DATA_PATH)
    assert len(df) == 195, f"Expected 195 rows, got {len(df)}"
    for col in EXPECTED_COLUMNS:
        assert col in df.columns, f"Missing column {col}"
    assert df.isnull().sum().sum() == 0, "Dataset contains unexpected missing values"

def test_target_values():
    df = pd.read_csv(DATA_PATH)
    unique_targets = set(df["status"].unique())
    assert unique_targets == {0, 1}, f"Target values must be binary {0, 1}, found {unique_targets}"

def test_subject_id_extraction():
    df = pd.read_csv(DATA_PATH)
    subjects = df["name"].str.extract(r"(phon_R\d+_S\d+)")
    assert subjects.isna().sum().sum() == 0, "Failed to extract subject identifiers from name column"
    assert subjects[0].nunique() == 32, f"Expected 32 unique subjects in official UCI data, got {subjects[0].nunique()}"

def test_model_artifact_load_and_inference():
    if not os.path.exists(MODEL_PATH):
        pytest.skip("Model artifact not yet generated")
    
    pipeline = joblib.load(MODEL_PATH)
    assert hasattr(pipeline, "predict"), "Pipeline missing predict method"

    # Create dummy sample DataFrame with exact 22 feature column names
    sample_df = pd.DataFrame([np.ones(EXPECTED_FEATURE_COUNT)], columns=FEATURE_COLUMNS)
    prediction = pipeline.predict(sample_df)
    assert prediction[0] in [0, 1], f"Prediction must be 0 or 1, got {prediction[0]}"

    if hasattr(pipeline, "predict_proba"):
        probs = pipeline.predict_proba(sample_df)
        assert probs.shape == (1, 2)
        assert 0.0 <= probs[0][0] <= 1.0
        assert 0.0 <= probs[0][1] <= 1.0

def test_model_card_metadata():
    if not os.path.exists(MODEL_CARD_PATH):
        pytest.skip("Model card not yet generated")
    
    with open(MODEL_CARD_PATH, "r") as f:
        card = json.load(f)
    
    assert "model_name" in card
    assert "test_metrics" in card
    assert "features" in card
    assert len(card["features"]) == EXPECTED_FEATURE_COUNT
    assert card["test_metrics"]["accuracy"] > 0.6, "Test accuracy unreasonably low"
    assert card["test_metrics"]["recall_sensitivity"] > 0.6, "Sensitivity unreasonably low"

