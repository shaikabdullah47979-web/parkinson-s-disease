import os
import json
import logging
from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
import joblib

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    "MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)", "MDVP:Jitter(%)",
    "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ", "Jitter:DDP", "MDVP:Shimmer",
    "MDVP:Shimmer(dB)", "Shimmer:APQ3", "Shimmer:APQ5", "MDVP:APQ", "Shimmer:DDA",
    "NHR", "HNR", "RPDE", "DFA", "spread1", "spread2", "D2", "PPE"
]

FEATURE_SPECS = {
    "MDVP:Fo(Hz)": {"desc": "Average vocal fundamental frequency", "cat": "Fundamental Frequency", "unit": "Hz"},
    "MDVP:Fhi(Hz)": {"desc": "Maximum vocal fundamental frequency", "cat": "Fundamental Frequency", "unit": "Hz"},
    "MDVP:Flo(Hz)": {"desc": "Minimum vocal fundamental frequency", "cat": "Fundamental Frequency", "unit": "Hz"},
    "MDVP:Jitter(%)": {"desc": "Cycle-to-cycle frequency variation percentage", "cat": "Frequency Perturbation (Jitter)", "unit": "%"},
    "MDVP:Jitter(Abs)": {"desc": "Absolute jitter", "cat": "Frequency Perturbation (Jitter)", "unit": "seconds"},
    "MDVP:RAP": {"desc": "Relative Amplitude Perturbation", "cat": "Frequency Perturbation (Jitter)", "unit": "ratio"},
    "MDVP:PPQ": {"desc": "Five-point Period Perturbation Quotient", "cat": "Frequency Perturbation (Jitter)", "unit": "ratio"},
    "Jitter:DDP": {"desc": "Average absolute difference of differences between jitter cycles", "cat": "Frequency Perturbation (Jitter)", "unit": "ratio"},
    "MDVP:Shimmer": {"desc": "Local shimmer (amplitude perturbation)", "cat": "Amplitude Perturbation (Shimmer)", "unit": "ratio"},
    "MDVP:Shimmer(dB)": {"desc": "Local shimmer in decibels", "cat": "Amplitude Perturbation (Shimmer)", "unit": "dB"},
    "Shimmer:APQ3": {"desc": "Three-point Amplitude Perturbation Quotient", "cat": "Amplitude Perturbation (Shimmer)", "unit": "ratio"},
    "Shimmer:APQ5": {"desc": "Five-point Amplitude Perturbation Quotient", "cat": "Amplitude Perturbation (Shimmer)", "unit": "ratio"},
    "MDVP:APQ": {"desc": "11-point Amplitude Perturbation Quotient", "cat": "Amplitude Perturbation (Shimmer)", "unit": "ratio"},
    "Shimmer:DDA": {"desc": "Average absolute difference between consecutive shimmer amplitudes", "cat": "Amplitude Perturbation (Shimmer)", "unit": "ratio"},
    "NHR": {"desc": "Noise-to-Harmonics Ratio", "cat": "Noise / Harmonics", "unit": "ratio"},
    "HNR": {"desc": "Harmonics-to-Noise Ratio", "cat": "Noise / Harmonics", "unit": "dB"},
    "RPDE": {"desc": "Recurrence Period Density Entropy", "cat": "Nonlinear Complexity", "unit": "entropy"},
    "DFA": {"desc": "Detrended Fluctuation Analysis fractal exponent", "cat": "Nonlinear Complexity", "unit": "exponent"},
    "spread1": {"desc": "Nonlinear fundamental frequency variation measure 1", "cat": "Nonlinear Dynamics", "unit": "log"},
    "spread2": {"desc": "Nonlinear fundamental frequency variation measure 2", "cat": "Nonlinear Dynamics", "unit": "ratio"},
    "D2": {"desc": "Correlation dimension attractor complexity", "cat": "Nonlinear Complexity", "unit": "dim"},
    "PPE": {"desc": "Pitch Period Entropy dysphonia measure", "cat": "Nonlinear Dynamics", "unit": "entropy"}
}

class MLService:
    def __init__(self):
        self.model = None
        self.model_card: Optional[Dict[str, Any]] = None
        self.dataset_metadata: Optional[Dict[str, Any]] = None
        self.dataset_stats: Optional[Dict[str, Any]] = None
        self.load_artifacts()

    def load_artifacts(self):
        model_path = os.path.join(settings.ML_ARTIFACTS_DIR, "best_model.joblib")
        card_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_card.json")
        metadata_path = os.path.join(settings.ML_DATA_DIR, "raw", "dataset_metadata.json")
        data_csv_path = os.path.join(settings.ML_DATA_DIR, "raw", "parkinsons.data")

        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                logger.info(f"Loaded trained model pipeline from {model_path}")
            except Exception as e:
                logger.error(f"Error loading model artifact: {e}")
                self.model = None

        if os.path.exists(card_path):
            try:
                with open(card_path, "r") as f:
                    self.model_card = json.load(f)
            except Exception as e:
                logger.error(f"Error loading model card: {e}")

        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    self.dataset_metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading dataset metadata: {e}")

        if os.path.exists(data_csv_path):
            try:
                df = pd.read_csv(data_csv_path)
                stats = {}
                for col in FEATURE_COLUMNS:
                    if col in df.columns:
                        stats[col] = {
                            "mean": float(df[col].mean()),
                            "std": float(df[col].std()),
                            "min": float(df[col].min()),
                            "max": float(df[col].max())
                        }
                self.dataset_stats = stats
            except Exception as e:
                logger.error(f"Error loading dataset statistics: {e}")

    def is_ready(self) -> bool:
        return self.model is not None and self.model_card is not None

    def predict(self, feature_dict: Dict[str, float]) -> Tuple[int, str, float, Optional[float], Optional[float]]:
        if not self.is_ready():
            raise RuntimeError("Model artifact is not loaded or missing. Run training pipeline first.")

        # Ensure exact ordering and presence of all 22 features
        row = []
        for feat in FEATURE_COLUMNS:
            if feat not in feature_dict:
                raise ValueError(f"Missing required acoustic feature: '{feat}'")
            val = float(feature_dict[feat])
            row.append(val)

        df_input = pd.DataFrame([row], columns=FEATURE_COLUMNS)
        pred_label = int(self.model.predict(df_input)[0])

        prob_pd = None
        prob_healthy = None
        confidence = 0.85

        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(df_input)[0]
            prob_healthy = float(probs[0])
            prob_pd = float(probs[1])
            confidence = float(max(prob_healthy, prob_pd))

        if pred_label == 1:
            pred_text = "Parkinson's Dysphonia Classified (Experimental)"
        else:
            pred_text = "Healthy Vocal Pattern Classified (Experimental)"

        return pred_label, pred_text, confidence, prob_pd, prob_healthy

    def get_features_list(self) -> list[dict]:
        res = []
        for feat in FEATURE_COLUMNS:
            spec = FEATURE_SPECS.get(feat, {"desc": feat, "cat": "General", "unit": ""})
            stats = self.dataset_stats.get(feat, {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0}) if self.dataset_stats else {}
            res.append({
                "name": feat,
                "description": spec["desc"],
                "category": spec["cat"],
                "unit": spec["unit"],
                "mean": stats.get("mean", 0.0),
                "std": stats.get("std", 0.0),
                "min": stats.get("min", 0.0),
                "max": stats.get("max", 0.0)
            })
        return res

ml_service = MLService()

