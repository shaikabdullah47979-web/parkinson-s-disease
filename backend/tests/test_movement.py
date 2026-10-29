import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.movement_service import movement_service
from backend.app.schemas.movement import (
    TremorAnalysisRequest, TappingAnalysisRequest,
    ArmAnalysisRequest, WalkingAnalysisRequest
)

client = TestClient(app)

def test_tremor_synthetic_4hz_signal():
    """Verify that a synthetic 4.5 Hz oscillation with noise is accurately identified."""
    duration = 10.0  # seconds
    fps = 30.0
    times = np.linspace(0.0, duration, int(duration * fps)) * 1000.0  # ms
    
    # 4.5 Hz sine wave + slow postural drift (0.3 Hz) + Gaussian noise
    freq_target = 4.5
    drift = 0.05 * np.sin(2 * np.pi * 0.3 * (times / 1000.0))
    tremor = 0.02 * np.sin(2 * np.pi * 4.5 * (times / 1000.0))
    noise = np.random.normal(0, 0.002, len(times))
    
    xs = 0.5 + drift + tremor + noise
    ys = 0.5 + noise

    req = TremorAnalysisRequest(
        timestamps_ms=times.tolist(),
        x_coords=xs.tolist(),
        y_coords=ys.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )

    res = movement_service.analyze_hand_tremor(req)
    assert res.status == "Reliable Estimate"
    assert res.dominant_frequency_hz is not None
    assert abs(res.dominant_frequency_hz - freq_target) <= 0.4
    assert res.tracking_continuity_pct == 100.0
    assert len(res.psd_spectrum) > 5

def test_tremor_synthetic_white_noise():
    """Verify that pure random noise is NOT falsely detected as a tremor frequency."""
    duration = 10.0
    fps = 30.0
    times = np.linspace(0.0, duration, int(duration * fps)) * 1000.0
    
    np.random.seed(42)
    xs = 0.5 + np.random.normal(0, 0.005, len(times))
    ys = 0.5 + np.random.normal(0, 0.005, len(times))

    req = TremorAnalysisRequest(
        timestamps_ms=times.tolist(),
        x_coords=xs.tolist(),
        y_coords=ys.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )

    res = movement_service.analyze_hand_tremor(req)
    assert res.status == "No Reliable Dominant Frequency Detected"
    assert res.dominant_frequency_hz is None

def test_tremor_insufficient_frames():
    """Verify that too few frames returns Insufficient Data."""
    req = TremorAnalysisRequest(
        timestamps_ms=[0, 33, 66],
        x_coords=[0.5, 0.51, 0.52],
        y_coords=[0.5, 0.5, 0.5]
    )
    res = movement_service.analyze_hand_tremor(req)
    assert res.status == "Insufficient Data"
    assert res.signal_quality == "Poor"

def test_finger_tapping_synthetic_analysis():
    """Verify tap counting and cadence on periodic distance pulse train."""
    duration = 10.0
    times = np.linspace(0.0, duration, 300) * 1000.0
    
    # 2 Hz tapping (2 taps per second = 20 taps in 10s = 120 taps/min)
    dists = 0.5 + 0.3 * np.cos(2 * np.pi * 2.0 * (times / 1000.0))
    
    req = TappingAnalysisRequest(
        timestamps_ms=times.tolist(),
        distances=dists.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )

    res = movement_service.analyze_finger_tapping(req)
    assert res.status == "Completed"
    assert res.total_taps >= 18
    assert res.validated_taps == res.total_taps
    assert abs(res.taps_per_minute - 120.0) <= 15.0
    assert abs(res.taps_per_second - 2.0) <= 0.3

def test_finger_tapping_stationary_hand_rejection():
    """Verify stationary hand with tracking noise produces zero false taps."""
    duration = 10.0
    times = np.linspace(0.0, duration, 300) * 1000.0
    # Stationary open hand with subpixel noise around 0.50
    np.random.seed(42)
    dists = 0.50 + np.random.normal(0, 0.015, len(times))

    req = TappingAnalysisRequest(
        timestamps_ms=times.tolist(),
        distances=dists.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )
    res = movement_service.analyze_finger_tapping(req)
    assert res.total_taps == 0
    assert res.validated_taps == 0
    assert res.status == "Inconclusive"
    assert res.rhythm_cv_pct == 0.0

def test_finger_tapping_amplitude_fatigue_decrement():
    """Verify amplitude fatigue correctly calculates reduction percentage."""
    duration = 10.0
    times = np.linspace(0.0, duration, 300) * 1000.0
    # 2 Hz tapping where amplitude drops from 0.8 to 0.4 over time
    envelope = np.linspace(0.8, 0.4, 300)
    dists = 0.25 + envelope * 0.5 * (1.0 + np.cos(2 * np.pi * 2.0 * (times / 1000.0)))

    req = TappingAnalysisRequest(
        timestamps_ms=times.tolist(),
        distances=dists.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )
    res = movement_service.analyze_finger_tapping(req)
    assert res.status == "Completed"
    assert res.total_taps >= 18
    assert res.amplitude_fatigue_ratio < 0.80
    assert res.amplitude_fatigue_pct > 20.0

def test_finger_tapping_few_taps_cv_safety():
    """Verify CV calculation doesn't crash or return invalid percentages with < 3 taps."""
    # 20 frames, with exactly 2 taps (dips to 0.2 separated by 300ms)
    dists = [0.7] * 20
    dists[5] = 0.2
    dists[12] = 0.2
    req = TappingAnalysisRequest(
        timestamps_ms=[i * 50.0 for i in range(len(dists))],
        distances=dists,
        total_delivered_frames=len(dists),
        duration_seconds=1.0
    )
    res = movement_service.analyze_finger_tapping(req)
    assert res.total_taps == 2
    assert res.status == "Inconclusive"
    assert res.rhythm_cv_pct == 0.0

def test_api_endpoints_via_http():
    """Verify movement HTTP endpoints respond with HTTP 200 and schema validation."""
    times = [i * 33.3 for i in range(50)]
    xs = [0.5 + 0.01 * np.sin(i * 0.5) for i in range(50)]
    ys = [0.5] * 50

    response = client.post("/api/v1/movement/analyze/tremor", json={
        "timestamps_ms": times,
        "x_coords": xs,
        "y_coords": ys,
        "total_delivered_frames": 50,
        "duration_seconds": 1.66
    })
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "plain_english_title" in data

def test_arm_movement_sparc_smoothness():
    """Verify that continuous rhythmic arm movement achieves a realistic smoothness score (>=85) using SPARC."""
    duration = 20.0
    times = np.linspace(0.0, duration, 600) * 1000.0  # 30 fps
    # 5 smooth flexion-extension cycles (0.25 Hz) with 1 deg camera jitter
    smooth_angles = 90.0 + 45.0 * np.sin(2 * np.pi * 0.25 * (times / 1000.0)) + np.random.normal(0, 0.5, len(times))

    req = ArmAnalysisRequest(
        timestamps_ms=times.tolist(),
        angles_deg=smooth_angles.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )

    res = movement_service.analyze_arm_movement(req)
    assert res.status == "Completed"
    assert res.smoothness_score >= 85.0, f"Expected smooth score >= 85, got {res.smoothness_score}"
    assert res.repetition_count >= 4
    assert res.excursion_range_deg >= 80.0
    assert "sparc_spectral_arc_length" in res.technical_details

def test_arm_movement_stationary_arm():
    """Verify that an arm held still produces Limited Excursion with clear clinical explanation."""
    duration = 20.0
    times = np.linspace(0.0, duration, 600) * 1000.0
    # Stationary arm at ~90 deg with minimal camera noise (< 2 deg)
    stationary_angles = 90.0 + np.random.normal(0, 0.4, len(times))

    req = ArmAnalysisRequest(
        timestamps_ms=times.tolist(),
        angles_deg=stationary_angles.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )

    res = movement_service.analyze_arm_movement(req)
    assert res.status == "Limited Excursion"
    assert res.excursion_range_deg < 15.0
    assert "Minimal Arm Movement" in res.plain_english_title

def test_arm_movement_insufficient_frames():
    """Verify that fewer than 15 frames gracefully returns Insufficient Data."""
    req = ArmAnalysisRequest(
        timestamps_ms=[100.0, 133.0, 166.0],
        angles_deg=[90.0, 92.0, 94.0],
        total_delivered_frames=3,
        duration_seconds=0.1
    )
    res = movement_service.analyze_arm_movement(req)
    assert res.status == "Insufficient Data"
    assert res.signal_quality == "Poor"
    assert res.smoothness_score == 0.0

def test_arm_movement_irregular_timestamps():
    """Verify non-uniform frame intervals are handled without velocity artifacts or zero-division."""
    # Irregular intervals between 20ms and 50ms
    np.random.seed(42)
    deltas = np.random.uniform(20.0, 50.0, 200)
    times = np.cumsum(np.insert(deltas, 0, 0.0))
    duration = times[-1] / 1000.0
    # 2 smooth flexion cycles
    angles = 90.0 + 35.0 * np.sin(2 * np.pi * 0.3 * (times / 1000.0))

    req = ArmAnalysisRequest(
        timestamps_ms=times.tolist(),
        angles_deg=angles.tolist(),
        total_delivered_frames=len(times),
        duration_seconds=duration
    )
    res = movement_service.analyze_arm_movement(req)
    assert res.status == "Completed"
    assert res.mean_angular_velocity_deg_per_sec > 0.0
    assert not np.isnan(res.mean_angular_velocity_deg_per_sec)
    assert not np.isinf(res.mean_angular_velocity_deg_per_sec)


