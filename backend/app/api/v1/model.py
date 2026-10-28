from fastapi import APIRouter, HTTPException, status
from backend.app.services.ml_service import ml_service
from backend.app.schemas.model import ModelStatusResponse, ModelMetricsResponse, MetricDetail

router = APIRouter(prefix="/model", tags=["Model"])

@router.get("/status", response_model=ModelStatusResponse)
def get_model_status():
    is_ready = ml_service.is_ready()
    card = ml_service.model_card or {}
    return ModelStatusResponse(
        model_loaded=is_ready,
        model_name=card.get("model_name"),
        algorithm_family=card.get("algorithm_family"),
        training_timestamp_utc=card.get("training_timestamp_utc"),
        feature_count=card.get("feature_count"),
        status="Model artifact loaded and ready for inference" if is_ready else "Model not loaded"
    )

@router.get("/metrics", response_model=ModelMetricsResponse)
def get_model_metrics():
    if not ml_service.is_ready() or not ml_service.model_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metrics unavailable. Model has not been trained or artifact is missing."
        )
    card = ml_service.model_card
    tm = card["test_metrics"]
    test_metrics = MetricDetail(
        accuracy=tm["accuracy"],
        precision=tm["precision"],
        recall_sensitivity=tm["recall_sensitivity"],
        specificity=tm["specificity"],
        f1_score=tm["f1_score"],
        roc_auc=tm.get("roc_auc"),
        confusion_matrix=tm["confusion_matrix"]
    )

    return ModelMetricsResponse(
        model_name=card["model_name"],
        algorithm_family=card["algorithm_family"],
        training_timestamp_utc=card["training_timestamp_utc"],
        test_metrics=test_metrics,
        top_features=card.get("top_features", []),
        all_feature_importances=card.get("all_feature_importances", {}),
        cross_validation_results=card.get("cross_validation_results", {}),
        candidate_comparison=card.get("all_candidate_test_metrics", {}),
        disclaimer=card.get("disclaimer", "Educational/research prototype only.")
    )

@router.get("/comparison")
def get_model_comparison():
    if not ml_service.model_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model comparison data not found")
    return {
        "selected_model": ml_service.model_card.get("model_name"),
        "candidates": ml_service.model_card.get("all_candidate_test_metrics", {}),
        "cross_validation": ml_service.model_card.get("cross_validation_results", {})
    }

