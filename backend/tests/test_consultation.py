from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_consultation_config():
    """Verify consultation configuration and the 5 supported Indian languages."""
    response = client.get("/api/v1/consultation/config")
    assert response.status_code == 200
    data = response.json()
    assert "server_key_configured" in data
    assert "default_model" in data
    assert "supported_languages" in data
    
    codes = [l["code"] for l in data["supported_languages"]]
    assert "en-IN" in codes
    assert "hi-IN" in codes
    assert "kn-IN" in codes
    assert "mr-IN" in codes
    assert "ur-PK" in codes

    urdu_entry = next(l for l in data["supported_languages"] if l["code"] == "ur-PK")
    assert urdu_entry["direction"] == "rtl"

def test_consultation_chat_missing_api_key():
    """Verify clear HTTP 400 error when neither server nor client provides a Gemini API key."""
    with patch("backend.app.services.gemini_service.settings.GEMINI_API_KEY", ""):
        response = client.post("/api/v1/consultation/chat", json={
            "message": "What is Parkinson's disease?",
            "language": "en-IN",
            "history": []
        })
        assert response.status_code == 400
        assert "Gemini API Key is missing" in response.json()["detail"]

def test_consultation_chat_mocked_gemini():
    """Verify conversation handling and language metadata when Gemini responds."""
    mock_response = MagicMock()
    mock_response.text = "Parkinson's disease is a neurological condition that primarily affects motor coordination."

    with patch("backend.app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post("/api/v1/consultation/chat", json={
            "message": "Explain resting tremor simply.",
            "language": "hi-IN",
            "api_key": "test-mock-api-key",
            "history": []
        })

        assert response.status_code == 200
        data = response.json()
        assert data["reply"] == mock_response.text
        assert data["language"] == "hi-IN"
        assert not data["is_rtl"]
        assert "disclaimer" in data

def test_consultation_summary_mocked():
    """Verify structured educational summary generation."""
    mock_summary_json = '{"title": "Tremor & Tapping Inquiry", "topics_discussed": ["Resting Tremor"], "key_questions_asked": ["What is tremor?"], "educational_explanations": ["Tremor occurs at 4-6 Hz"], "questions_for_doctor": ["Can I have an in-person assessment?"]}'
    mock_response = MagicMock()
    mock_response.text = mock_summary_json

    with patch("backend.app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post("/api/v1/consultation/summary", json={
            "history": [
                {"role": "user", "content": "What is tremor?"},
                {"role": "model", "content": "Tremor is involuntary rhythmic shaking."}
            ],
            "language": "en-IN",
            "duration_seconds": 45.0,
            "api_key": "test-mock-api-key"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Tremor & Tapping Inquiry"
        assert "Resting Tremor" in data["topics_discussed"]
        assert data["duration_seconds"] == 45.0
