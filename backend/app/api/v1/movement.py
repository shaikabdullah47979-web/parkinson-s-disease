from fastapi import APIRouter, HTTPException, status
import logging

from backend.app.schemas.movement import (
    TremorAnalysisRequest, TremorAnalysisResponse,
    TappingAnalysisRequest, TappingAnalysisResponse,
    ArmAnalysisRequest, ArmAnalysisResponse,
    WalkingAnalysisRequest, WalkingAnalysisResponse
)
from backend.app.services.movement_service import movement_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/movement", tags=["Live Movement Analysis"])

@router.post("/analyze/tremor", response_model=TremorAnalysisResponse, summary="Analyze hand tremor kinematics and power spectral density")
async def analyze_tremor(req: TremorAnalysisRequest):
    """
    Receives timestamped 2D hand landmark coordinates.
    Performs cubic/linear interpolation, Butterworth high-pass drift separation,
    and Welch's Power Spectral Density (PSD) to detect dominant oscillation frequency in Hz.
    """
    try:
        return movement_service.analyze_hand_tremor(req)
    except Exception as e:
        logger.error(f"Error during tremor analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signal processing error during tremor frequency estimation: {str(e)}"
        )

@router.post("/analyze/tapping", response_model=TappingAnalysisResponse, summary="Analyze finger tapping speed, cadence, and rhythm variability")
async def analyze_tapping(req: TappingAnalysisRequest):
    """
    Receives timestamped thumb-index distance values.
    Applies adaptive threshold calibration, event refractory filtering,
    and calculates cadence (taps/min), inter-tap interval CV%, and amplitude decay.
    """
    try:
        return movement_service.analyze_finger_tapping(req)
    except Exception as e:
        logger.error(f"Error during tapping analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing finger tapping kinematics: {str(e)}"
        )

@router.post("/analyze/arm", response_model=ArmAnalysisResponse, summary="Analyze arm flexion-extension range, velocity, and smoothness")
async def analyze_arm(req: ArmAnalysisRequest):
    """
    Receives timestamped elbow joint angles.
    Filters angular acceleration to evaluate excursion range, angular velocity, and movement smoothness.
    """
    try:
        return movement_service.analyze_arm_movement(req)
    except Exception as e:
        logger.error(f"Error during arm movement analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing arm kinematics: {str(e)}"
        )

@router.post("/analyze/walking", response_model=WalkingAnalysisResponse, summary="Analyze walking cadence, posture lean, and step symmetry")
async def analyze_walking(req: WalkingAnalysisRequest):
    """
    Receives timestamped trunk lean angles and ankle vertical trajectories.
    Estimates cadence, trunk tilt stability, and true bilateral step symmetry.
    """
    try:
        return movement_service.analyze_walking(req)
    except Exception as e:
        logger.error(f"Error during walking analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing walking posture: {str(e)}"
        )

