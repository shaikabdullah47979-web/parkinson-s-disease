from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class ChatMessage(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role: str = Field(..., description="Role: 'user', 'model', or 'assistant'")
    content: str = Field(..., description="Text content of the message")
    timestamp: Optional[float] = None

class ConsultationRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message: str = Field(..., description="User's input utterance or text")
    language: str = Field("en-IN", description="Language code: en-IN, hi-IN, kn-IN, mr-IN, ur-PK")
    history: List[ChatMessage] = Field(default=[], description="Previous conversation turns")
    patient_context: Optional[Dict[str, Any]] = Field(default=None, description="Optional battery assessment findings")
    api_key: Optional[str] = Field(default=None, description="Optional client-provided Gemini API key")

class ConsultationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    reply: str
    language: str
    is_rtl: bool = False
    disclaimer: str
    model_used: str

class ConsultationSummaryRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    history: List[ChatMessage]
    language: str = "en-IN"
    duration_seconds: float = 0.0
    api_key: Optional[str] = None

class ConsultationSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str
    date_time: str
    duration_seconds: float
    language: str
    topics_discussed: List[str]
    key_questions_asked: List[str]
    educational_explanations: List[str]
    questions_for_doctor: List[str]
    disclaimer: str

class SupportedLanguage(BaseModel):
    code: str
    name: str
    native_name: str
    direction: str = "ltr"

class ConsultationConfigResponse(BaseModel):
    server_key_configured: bool
    default_model: str
    supported_languages: List[SupportedLanguage]

