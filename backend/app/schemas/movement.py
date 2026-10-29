from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class SpectralPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    freq_hz: float = Field(..., description="Frequency in Hertz")
    power: float = Field(..., description="Power spectral density amplitude")

class MotionPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    time_sec: float = Field(..., description="Elapsed time in seconds")
    displacement: float = Field(..., description="Detrended displacement")

# --- Tremor Schemas ---
class TremorAnalysisRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    timestamps_ms: List[float] = Field(..., description="Hardware/performance timestamps in ms")
    x_coords: List[float] = Field(..., description="Hand landmark X coordinates (0-1)")
    y_coords: List[float] = Field(..., description="Hand landmark Y coordinates (0-1)")
    total_delivered_frames: Optional[int] = Field(None, description="Total camera hardware frames delivered")
    duration_seconds: Optional[float] = Field(None, description="Recorded test duration")

class TremorAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str = Field(..., description="Reliable Estimate | Preliminary Estimate | No Reliable Dominant Frequency Detected | Insufficient Data")
    dominant_frequency_hz: Optional[float] = None
    dominant_cycles_per_min: Optional[float] = None
    spectral_peak_prominence: Optional[float] = None
    snr_db: Optional[float] = None
    effective_fps: float
    delivered_frames: int
    tracked_frames: int
    tracking_continuity_pct: float
    duration_seconds: float
    mean_amplitude_displacement: float
    psd_spectrum: List[SpectralPoint] = []
    time_series: List[MotionPoint] = []
    signal_quality: str  # Good | Moderate | Poor
    plain_english_title: str
    plain_english_explanation: str
    recommended_action: str
    technical_details: Dict[str, Any] = {}

# --- Finger Tapping Schemas ---
class TappingAnalysisRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    timestamps_ms: List[float]
    distances: List[float]
    total_delivered_frames: Optional[int] = None
    duration_seconds: Optional[float] = None

class TapEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    time_sec: float
    interval_ms: float
    amplitude: float

class TappingAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    total_taps: int
    validated_taps: int
    taps_per_minute: float
    taps_per_second: float = 0.0
    mean_iti_ms: float
    iti_std_ms: float
    rhythm_cv_pct: float
    amplitude_fatigue_ratio: float
    amplitude_fatigue_pct: Optional[float] = None
    tracking_continuity_pct: float
    duration_seconds: float
    tap_events: List[TapEvent] = []
    distance_series: List[MotionPoint] = []
    signal_quality: str
    plain_english_title: str
    plain_english_explanation: str
    recommended_action: str
    technical_details: Dict[str, Any] = {}

# --- Arm Movement Schemas ---
class ArmAnalysisRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    timestamps_ms: List[float]
    angles_deg: List[float]
    total_delivered_frames: Optional[int] = None
    duration_seconds: Optional[float] = None

class ArmAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    min_elbow_angle_deg: float
    max_elbow_angle_deg: float
    excursion_range_deg: float
    mean_angular_velocity_deg_per_sec: float
    peak_angular_velocity_deg_per_sec: float
    smoothness_score: float
    repetition_count: int
    tracking_continuity_pct: float
    duration_seconds: float
    angle_series: List[MotionPoint] = []
    signal_quality: str
    plain_english_title: str
    plain_english_explanation: str
    recommended_action: str
    technical_details: Dict[str, Any] = {}

# --- Walking & Posture Schemas ---
class WalkingAnalysisRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    timestamps_ms: List[float]
    trunk_angles_deg: List[float]
    left_ankle_y: List[float]
    right_ankle_y: List[float]
    total_delivered_frames: Optional[int] = None
    duration_seconds: Optional[float] = None

class WalkingAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    step_count: int
    cadence_steps_per_min: float
    step_symmetry_pct: float
    mean_trunk_lean_deg: float
    posture_stability_score: float
    tracking_continuity_pct: float
    duration_seconds: float
    lean_series: List[MotionPoint] = []
    signal_quality: str
    plain_english_title: str
    plain_english_explanation: str
    recommended_action: str
    technical_details: Dict[str, Any] = {}

