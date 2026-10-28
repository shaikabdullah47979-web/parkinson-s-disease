import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

SAMPLE_VALID_FEATURES = {
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

def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["ml_model_ready"] is True

def test_dataset_status():
    res = client.get("/api/v1/dataset/status")
    assert res.status_code == 200
    data = res.json()
    assert data["row_count"] == 195
    assert data["column_count"] in [24, 25]
    assert data["unique_subjects"] == 32

def test_dataset_features():
    res = client.get("/api/v1/dataset/features")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 22
    assert any(f["name"] == "MDVP:Fo(Hz)" for f in data)

def test_model_status():
    res = client.get("/api/v1/model/status")
    assert res.status_code == 200
    data = res.json()
    assert data["model_loaded"] is True
    assert "Gradient Boosting" in data["model_name"]

def test_model_metrics():
    res = client.get("/api/v1/model/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "test_metrics" in data
    assert data["test_metrics"]["accuracy"] > 0.6
    assert len(data["top_features"]) > 0

def test_auth_and_prediction_workflow():
    test_email = f"test_researcher_{pytest.__version__}@research.org"
    test_pass = "SecurePass123!"

    # 1. Register
    reg_res = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "password": test_pass,
        "full_name": "Test Researcher"
    })
    assert reg_res.status_code in [201, 400]  # If already exists from earlier run, 400 is fine

    # 2. Login
    login_res = client.post("/api/v1/auth/login", data={
        "username": test_email,
        "password": test_pass
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Predict with authenticated header
    pred_res = client.post("/api/v1/predict", json={
        "features": SAMPLE_VALID_FEATURES,
        "notes": "Automated integration test case"
    }, headers=headers)
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert pred_data["prediction_label"] in [0, 1]
    assert "disclaimer" in pred_data
    assert pred_data["confidence_score"] > 0.0

    # 4. Check user prediction history
    hist_res = client.get("/api/v1/predictions", headers=headers)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert len(hist_data) >= 1
    assert hist_data[0]["notes"] == "Automated integration test case"

def test_predict_validation_error():
    # Submit invalid feature (negative frequency, missing required values)
    bad_features = SAMPLE_VALID_FEATURES.copy()
    bad_features["MDVP:Fo(Hz)"] = -10.0  # violates ge=50.0

    res = client.post("/api/v1/predict", json={"features": bad_features})
    assert res.status_code == 422

def test_unauthenticated_predictions_history():
    # Calling /api/v1/predictions without Authorization header must succeed (open platform)
    res = client.get("/api/v1/predictions")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

