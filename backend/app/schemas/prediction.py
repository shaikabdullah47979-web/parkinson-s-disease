from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class VoiceAcousticFeatures(BaseModel):
    mdvp_fo_hz: float = Field(..., alias="MDVP:Fo(Hz)", description="Average vocal fundamental frequency in Hz", ge=50.0, le=400.0)
    mdvp_fhi_hz: float = Field(..., alias="MDVP:Fhi(Hz)", description="Maximum vocal fundamental frequency in Hz", ge=60.0, le=700.0)
    mdvp_flo_hz: float = Field(..., alias="MDVP:Flo(Hz)", description="Minimum vocal fundamental frequency in Hz", ge=40.0, le=400.0)
    mdvp_jitter_pct: float = Field(..., alias="MDVP:Jitter(%)", description="MDVP local jitter percent", ge=0.0, le=10.0)
    mdvp_jitter_abs: float = Field(..., alias="MDVP:Jitter(Abs)", description="MDVP absolute jitter in seconds", ge=0.0, le=0.01)
    mdvp_rap: float = Field(..., alias="MDVP:RAP", description="Relative Amplitude Perturbation", ge=0.0, le=0.1)
    mdvp_ppq: float = Field(..., alias="MDVP:PPQ", description="Five-point Period Perturbation Quotient", ge=0.0, le=0.1)
    jitter_ddp: float = Field(..., alias="Jitter:DDP", description="Average absolute difference of differences between jitter cycles", ge=0.0, le=0.3)
    mdvp_shimmer: float = Field(..., alias="MDVP:Shimmer", description="MDVP local shimmer", ge=0.0, le=0.5)
    mdvp_shimmer_db: float = Field(..., alias="MDVP:Shimmer(dB)", description="MDVP local shimmer in dB", ge=0.0, le=5.0)
    shimmer_apq3: float = Field(..., alias="Shimmer:APQ3", description="Three-point Amplitude Perturbation Quotient", ge=0.0, le=0.3)
    shimmer_apq5: float = Field(..., alias="Shimmer:APQ5", description="Five-point Amplitude Perturbation Quotient", ge=0.0, le=0.3)
    mdvp_apq: float = Field(..., alias="MDVP:APQ", description="MDVP 11-point Amplitude Perturbation Quotient", ge=0.0, le=0.3)
    shimmer_dda: float = Field(..., alias="Shimmer:DDA", description="Average absolute difference between consecutive shimmer amplitudes", ge=0.0, le=0.8)
    nhr: float = Field(..., alias="NHR", description="Noise-to-Harmonics Ratio", ge=0.0, le=1.0)
    hnr: float = Field(..., alias="HNR", description="Harmonics-to-Noise Ratio in dB", ge=0.0, le=50.0)
    rpde: float = Field(..., alias="RPDE", description="Recurrence Period Density Entropy", ge=0.0, le=1.0)
    dfa: float = Field(..., alias="DFA", description="Detrended Fluctuation Analysis signal fractal exponent", ge=0.0, le=1.5)
    spread1: float = Field(..., alias="spread1", description="Nonlinear fundamental frequency variation measure 1", ge=-12.0, le=0.0)
    spread2: float = Field(..., alias="spread2", description="Nonlinear fundamental frequency variation measure 2", ge=0.0, le=1.0)
    d2: float = Field(..., alias="D2", description="Correlation dimension", ge=0.5, le=5.0)
    ppe: float = Field(..., alias="PPE", description="Pitch Period Entropy", ge=0.0, le=1.0)

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "MDVP:Fo(Hz)": 154.229,
                "MDVP:Fhi(Hz)": 197.104,
                "MDVP:Flo(Hz)": 116.324,
                "MDVP:Jitter(%)": 0.00622,
                "MDVP:Jitter(Abs)": 0.000044,
                "MDVP:RAP": 0.00330,
                "MDVP:PPQ": 0.00344,
                "Jitter:DDP": 0.00992,
                "MDVP:Shimmer": 0.02970,
                "MDVP:Shimmer(dB)": 0.282,
                "Shimmer:APQ3": 0.01566,
                "Shimmer:APQ5": 0.01787,
                "MDVP:APQ": 0.02408,
                "Shimmer:DDA": 0.04699,
                "NHR": 0.02484,
                "HNR": 21.885,
                "RPDE": 0.498536,
                "DFA": 0.718099,
                "spread1": -5.684397,
                "spread2": 0.226510,
                "D2": 2.381826,
                "PPE": 0.206552
            }
        }
    )

class PredictionRequest(BaseModel):
    features: VoiceAcousticFeatures
    notes: Optional[str] = None

class PredictionResponse(BaseModel):
    prediction_label: int  # 0 or 1
    prediction_text: str
    confidence_score: Optional[float]
    probability_parkinsons: Optional[float]
    probability_healthy: Optional[float]
    model_name: str
    record_id: Optional[int] = None
    created_at: datetime
    disclaimer: str

class PredictionRecordOut(BaseModel):
    id: int
    user_id: Optional[int]
    model_name: str
    input_features: Dict[str, Any]
    prediction_label: int
    prediction_text: str
    confidence_score: Optional[float]
    created_at: datetime
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)

