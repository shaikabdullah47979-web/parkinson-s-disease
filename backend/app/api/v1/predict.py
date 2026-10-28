from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.prediction import PredictionRecord
from backend.app.schemas.prediction import (
    PredictionRequest, PredictionResponse, PredictionRecordOut
)
from backend.app.services.ml_service import ml_service
from backend.app.api.v1.auth import get_optional_user, get_current_user

router = APIRouter(tags=["Prediction"])

@router.post("/predict", response_model=PredictionResponse)
def create_prediction(
    req: PredictionRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    if not ml_service.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Machine learning model is not ready or artifact is missing. Please verify model training."
        )

    # Convert Pydantic model to feature dictionary using original field alias names
    features_dict = req.features.model_dump(by_alias=True)

    try:
        pred_label, pred_text, confidence, prob_pd, prob_healthy = ml_service.predict(features_dict)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Prediction error: {str(e)}")

    record = PredictionRecord(
        user_id=user.id if user else None,
        model_name=ml_service.model_card.get("model_name", "Trained Model") if ml_service.model_card else "Model",
        input_features=features_dict,
        prediction_label=pred_label,
        prediction_text=pred_text,
        confidence_score=confidence,
        notes=req.notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    disclaimer = (
        "This application is an educational and research prototype. Outputs are experimental statistical classifications "
        "based on sustained vowel phonation measurements and must NOT be used as a medical diagnosis or clinical substitute."
    )

    return PredictionResponse(
        prediction_label=pred_label,
        prediction_text=pred_text,
        confidence_score=confidence,
        probability_parkinsons=prob_pd,
        probability_healthy=prob_healthy,
        model_name=record.model_name,
        record_id=record.id,
        created_at=record.created_at,
        disclaimer=disclaimer
    )

@router.get("/predictions", response_model=List[PredictionRecordOut])
def list_predictions(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    skip: int = 0,
    limit: int = 50
):
    query = db.query(PredictionRecord)
    if user:
        query = query.filter(PredictionRecord.user_id == user.id)
    records = query.order_by(PredictionRecord.created_at.desc()).offset(skip).limit(limit).all()
    return records

@router.get("/predictions/{record_id}", response_model=PredictionRecordOut)
def get_prediction(
    record_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    query = db.query(PredictionRecord).filter(PredictionRecord.id == record_id)
    if user:
        query = query.filter(PredictionRecord.user_id == user.id)
    record = query.first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found")
    return record

@router.delete("/predictions/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prediction(
    record_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    query = db.query(PredictionRecord).filter(PredictionRecord.id == record_id)
    if user:
        query = query.filter(PredictionRecord.user_id == user.id)
    record = query.first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found")
    db.delete(record)
    db.commit()
    return None

