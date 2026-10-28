from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class MetricDetail(BaseModel):
    accuracy: float
    precision: float
    recall_sensitivity: float
    specificity: float
    f1_score: float
    roc_auc: Optional[float]
    confusion_matrix: Dict[str, int]

class ModelStatusResponse(BaseModel):
    model_loaded: bool
    model_name: Optional[str]
    algorithm_family: Optional[str]
    training_timestamp_utc: Optional[str]
    feature_count: Optional[int]
    status: str

class ModelMetricsResponse(BaseModel):
    model_name: str
    algorithm_family: str
    training_timestamp_utc: str
    test_metrics: MetricDetail
    top_features: List[List[Any]]
    all_feature_importances: Dict[str, float]
    cross_validation_results: Dict[str, Any]
    candidate_comparison: Dict[str, Any]
    disclaimer: str

class DatasetStatusResponse(BaseModel):
    dataset_name: str
    row_count: int
    column_count: int
    unique_subjects: int
    target_distribution: Dict[str, int]
    missing_values: int
    duplicates: int
    source_url: Optional[str]
    citation: Optional[str]

class FeatureDescription(BaseModel):
    name: str
    description: str
    category: str
    unit: str
    mean: float
    std: float
    min: float
    max: float

