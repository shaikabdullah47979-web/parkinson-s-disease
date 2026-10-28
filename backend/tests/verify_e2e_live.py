"""
End-to-End Live Verification Script for Parkinson's Platform.
Executes live HTTP requests against running Backend and Frontend.
"""

import sys
import json
import urllib.request
import urllib.parse
import urllib.error

BACKEND_BASE = "http://127.0.0.1:8000/api/v1"
FRONTEND_BASE = "http://127.0.0.1:8000"

SAMPLE_PD_FEATURES = {
    "MDVP:Fo(Hz)": 119.992,
    "MDVP:Fhi(Hz)": 157.302,
    "MDVP:Flo(Hz)": 74.997,
    "MDVP:Jitter(%)": 0.00784,
    "MDVP:Jitter(Abs)": 0.00007,
    "MDVP:RAP": 0.00370,
    "MDVP:PPQ": 0.00554,
    "Jitter:DDP": 0.01109,
    "MDVP:Shimmer": 0.04374,
    "MDVP:Shimmer(dB)": 0.426,
    "Shimmer:APQ3": 0.02182,
    "Shimmer:APQ5": 0.03130,
    "MDVP:APQ": 0.02971,
    "Shimmer:DDA": 0.06545,
    "NHR": 0.02211,
    "HNR": 21.033,
    "RPDE": 0.414783,
    "DFA": 0.815285,
    "spread1": -4.813031,
    "spread2": 0.266482,
    "D2": 2.301442,
    "PPE": 0.284654
}

SAMPLE_HEALTHY_FEATURES = {
    "MDVP:Fo(Hz)": 197.076,
    "MDVP:Fhi(Hz)": 206.896,
    "MDVP:Flo(Hz)": 192.055,
    "MDVP:Jitter(%)": 0.00289,
    "MDVP:Jitter(Abs)": 0.00001,
    "MDVP:RAP": 0.00166,
    "MDVP:PPQ": 0.00168,
    "Jitter:DDP": 0.00498,
    "MDVP:Shimmer": 0.01098,
    "MDVP:Shimmer(dB)": 0.097,
    "Shimmer:APQ3": 0.00563,
    "Shimmer:APQ5": 0.00680,
    "MDVP:APQ": 0.00802,
    "Shimmer:DDA": 0.01689,
    "NHR": 0.00339,
    "HNR": 26.775,
    "RPDE": 0.422229,
    "DFA": 0.741367,
    "spread1": -7.348300,
    "spread2": 0.177551,
    "D2": 1.743867,
    "PPE": 0.085569
}

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None:
        if isinstance(data, dict) and "application/x-www-form-urlencoded" in headers.get("Content-Type", ""):
            body = urllib.parse.urlencode(data).encode("utf-8")
        elif isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            body = data
    else:
        body = None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            status = resp.status
            try:
                res_json = json.loads(content)
            except Exception:
                res_json = content
            return status, res_json
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            res_json = json.loads(content)
        except Exception:
            res_json = content
        return e.code, res_json

def run_checks():
    checks = []

    def log_check(name, passed, detail=""):
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name}: {detail}")
        checks.append({"name": name, "passed": passed, "detail": detail})

    print("=== LIVE END-TO-END VERIFICATION STARTING ===")

    # 1. Health check
    code, data = make_req(f"{BACKEND_BASE}/health")
    log_check("Backend /health endpoint", code == 200 and data.get("ml_model_ready") is True, f"Status {code}, ml_model_ready={data.get('ml_model_ready')}")

    # 2. Dataset Status
    code, data = make_req(f"{BACKEND_BASE}/dataset/status")
    log_check("Dataset Status endpoint", code == 200 and data.get("row_count") == 195, f"Status {code}, rows={data.get('row_count')}, subjects={data.get('unique_subjects')}")

    # 3. Dataset Features
    code, data = make_req(f"{BACKEND_BASE}/dataset/features")
    log_check("Dataset Features endpoint", code == 200 and len(data) == 22, f"Status {code}, {len(data) if isinstance(data, list) else 0} features documented")

    # 4. Model Status
    code, data = make_req(f"{BACKEND_BASE}/model/status")
    log_check("Model Status endpoint", code == 200 and data.get("model_loaded") is True, f"Status {code}, model={data.get('model_name')}")

    # 5. Model Metrics
    code, data = make_req(f"{BACKEND_BASE}/model/metrics")
    tm = data.get("test_metrics", {})
    log_check("Model Metrics endpoint", code == 200 and "accuracy" in tm, f"Status {code}, Acc={tm.get('accuracy')*100:.1f}%, Sens={tm.get('recall_sensitivity')*100:.1f}%, F1={tm.get('f1_score'):.3f}")

    # 6. Authenticate as Demo Researcher
    code, data = make_req(
        f"{BACKEND_BASE}/auth/login",
        method="POST",
        data={"username": "researcher@neurovoice.org", "password": "NeuroResearch2026!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = data.get("access_token") if code == 200 else None
    log_check("Researcher Login (JWT Auth)", code == 200 and token is not None, f"Status {code}, token received: {bool(token)}")

    auth_headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 7. Execute Prediction: Positive PD Sample
    code, data = make_req(
        f"{BACKEND_BASE}/predict",
        method="POST",
        data={"features": SAMPLE_PD_FEATURES, "notes": "E2E Live Verification - PD Specimen"},
        headers=auth_headers
    )
    log_check(
        "Prediction: Positive PD Specimen",
        code == 200 and data.get("prediction_label") == 1,
        f"Status {code}, Label={data.get('prediction_label')}, Conf={data.get('confidence_score')*100:.2f}%, Text='{data.get('prediction_text')}'"
    )

    # 8. Execute Prediction: Healthy Control Sample
    code, data = make_req(
        f"{BACKEND_BASE}/predict",
        method="POST",
        data={"features": SAMPLE_HEALTHY_FEATURES, "notes": "E2E Live Verification - Healthy Specimen"},
        headers=auth_headers
    )
    log_check(
        "Prediction: Healthy Control Specimen",
        code == 200 and "prediction_label" in data,
        f"Status {code}, Label={data.get('prediction_label')}, Conf={data.get('confidence_score')*100:.2f}%, Text='{data.get('prediction_text')}'"
    )

    # 9. Schema Validation Error Check (Negative frequency)
    bad_features = SAMPLE_PD_FEATURES.copy()
    bad_features["MDVP:Fo(Hz)"] = -50.0  # violates ge=50.0
    code, data = make_req(
        f"{BACKEND_BASE}/predict",
        method="POST",
        data={"features": bad_features, "notes": "Invalid input test"}
    )
    log_check("Validation Rejection on Out-of-Bounds Input", code == 422, f"Status {code} (HTTP 422 Unprocessable Entity expected)")

    # 10. Database Prediction History Retrieval
    code, data = make_req(f"{BACKEND_BASE}/predictions", headers=auth_headers)
    count = len(data) if isinstance(data, list) else 0
    log_check("Database Persistence & Audit Retrieval", code == 200 and count >= 2, f"Status {code}, retrieved {count} saved prediction records")

    # 11. Frontend Server Connectivity
    code, data = make_req(FRONTEND_BASE)
    log_check("Frontend Web Server (Vite)", code == 200, f"Status {code}, HTML rendered and served at {FRONTEND_BASE}")

    print("=== LIVE END-TO-END VERIFICATION COMPLETED ===")
    all_passed = all(c["passed"] for c in checks)
    return all_passed

if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)
