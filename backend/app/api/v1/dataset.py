from typing import List
from fastapi import APIRouter, HTTPException, status
from backend.app.services.ml_service import ml_service
from backend.app.schemas.model import DatasetStatusResponse, FeatureDescription

router = APIRouter(prefix="/dataset", tags=["Dataset"])

@router.get("/status", response_model=DatasetStatusResponse)
def get_dataset_status():
    if not ml_service.dataset_metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset metadata not found. Run dataset download script first."
        )
    meta = ml_service.dataset_metadata
    return DatasetStatusResponse(
        dataset_name=meta.get("dataset_name", "Parkinson's Disease Voice Dataset"),
        row_count=meta.get("row_count", 0),
        column_count=meta.get("column_count", 0),
        unique_subjects=meta.get("unique_subjects", 0),
        target_distribution=meta.get("target_distribution", {}),
        missing_values=meta.get("missing_values_count", 0),
        duplicates=meta.get("duplicate_rows_count", 0),
        source_url=meta.get("download_url"),
        citation=meta.get("citation")
    )

@router.get("/features", response_model=List[FeatureDescription])
def get_dataset_features():
    features = ml_service.get_features_list()
    return [FeatureDescription(**f) for f in features]

