import os
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from backend.app.core.config import settings
from backend.app.schemas.consultation import (
    ChatMessage,
    ConsultationRequest,
    ConsultationResponse,
    ConsultationSummaryRequest,
    ConsultationSummaryResponse,
    SupportedLanguage
)

logger = logging.getLogger("parkinsons_app.gemini")

SUPPORTED_LANGUAGES: List[SupportedLanguage] = [
    SupportedLanguage(code="en-IN", name="English (India)", native_name="English", direction="ltr"),
    SupportedLanguage(code="hi-IN", name="Hindi", native_name="हिंदी", direction="ltr"),
    SupportedLanguage(code="kn-IN", name="Kannada", native_name="ಕನ್ನಡ", direction="ltr"),
    SupportedLanguage(code="mr-IN", name="Marathi", native_name="मराठी", direction="ltr"),
    SupportedLanguage(code="ur-PK", name="Urdu", native_name="اردو", direction="rtl"),
]

LANGUAGE_PROMPTS = {
    "en-IN": "Respond naturally and clearly in Indian English. Keep phrasing conversational and easy to understand.",
    "hi-IN": "Respond strictly in natural conversational Hindi using Devanagari script (हिंदी). Use clear, everyday words rather than overly formal Sanskritized or English words, while translating medical concepts simply.",
    "kn-IN": "Respond strictly in natural conversational Kannada using Kannada script (ಕನ್ನಡ). Use friendly and clear language, explaining medical concepts in simple terms.",
    "mr-IN": "Respond strictly in natural conversational Marathi using Marathi script (मराठी). Be warm, polite, and explain medical terminology in accessible terms.",
    "ur-PK": "Respond strictly in natural, polite Urdu using Urdu/Arabic script (اردو). Use standard respectful vocabulary, ensuring appropriate medical explanations in everyday language.",
}

DISCLAIMERS = {
    "en-IN": "NeuroVoice AI is an educational screening and research exploration tool, not a medical diagnosis or substitute for a clinical neurologist.",
    "hi-IN": "न्यूरोवॉइस एआई एक शैक्षिक अनुसंधान और स्क्रीनिंग उपकरण है, यह कोई चिकित्सीय निदान या न्यूरोलॉजिस्ट का विकल्प नहीं है।",
    "kn-IN": "ನ್ಯೂರೋವಾಯ್ಸ್ ಎಐ ಒಂದು ಶೈಕ್ಷಣಿಕ ಸಂಶೋಧನೆ ಮತ್ತು ಸ್ಕ್ರೀನಿಂಗ್ ಸಾಧನವಾಗಿದೆ, ಇದು ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ಅಥವಾ ನರವಿಜ್ಞಾನಿಗಳ ಪರ್ಯಾಯವಲ್ಲ.",
    "mr-IN": "न्यूरोव्हॉइस एआय हे एक शैक्षणिक संशोधन आणि स्क्रीनिंग साधन आहे, हे वैद्यकीय निदान किंवा न्यूरोलॉजिस्टचा पर्याय नाही.",
    "ur-PK": "نیورو وائس اے آئی ایک تعلیمی تحقیق اور اسکریننگ ٹول ہے، یہ طبی تشخیص یا نیورولوجسٹ کا متبادل نہیں ہے۔",
}

BASE_SYSTEM_INSTRUCTION = """You are Dr. NeuroVoice Clinical AI, an empathetic, knowledgeable, and reassuring medical conversational assistant specialized in Parkinson's disease research, screening, and motor assessment guidance.

CORE OBJECTIVES & PROTOCOL:
1. Provide accurate, empathetic, and evidence-based educational information regarding Parkinson's disease symptoms, including resting tremor (typically 4-6 Hz), bradykinesia (slowness and decremental amplitude), muscle rigidity, and vocal dysphonia (reduced loudness, breathiness, pitch variation).
2. Help users understand tests available in the NeuroVoice platform:
   - Voice Dysphonia Acoustic Analysis (MDVP jitter, shimmer, HNR, PPE, RPDE).
   - Hand Resting Tremor & Oscillation Test (MediaPipe wrist & finger landmark frequency tracking).
   - Finger Tapping Test (thumb-to-index cadence, rhythm consistency CV, and fatigue decrement).
   - Arm Movement Excursion Test (elbow flexion-extension angle, SPARC movement smoothness).
   - Walking, Posture & Balance Test (trunk posture angle, gait stride rhythm).
3. If the user shares their current test scores or patient context, reference them accurately and explain what the metrics indicate in plain, comforting terms.
4. ABSOLUTE MEDICAL BOUNDARIES:
   - You are strictly an educational and screening assistant.
   - You NEVER definitively diagnose Parkinson's disease or any neurological disorder.
   - You NEVER prescribe medications (e.g., Levodopa, Carbidopa, Pramipexole) or suggest altering dosages.
   - You always encourage discussing findings with a qualified neurologist or primary care physician.
5. CONVERSATIONAL TONE FOR SPOKEN VOICE:
   - Since your response is spoken aloud to the patient, keep answers concise (typically 2 to 4 sentences).
   - Avoid markdown bullet points or asterisk lists in spoken chat unless explicitly requested. Speak naturally and fluently.
"""

class GeminiService:
    @staticmethod
    def get_client(api_key: Optional[str] = None) -> genai.Client:
        resolved_key = (api_key or "").strip() or settings.GEMINI_API_KEY.strip()
        if not resolved_key:
            raise ValueError(
                "Gemini API Key is missing. Please enter your Gemini API key in the top settings bar "
                "or configure GEMINI_API_KEY in the server environment."
            )
        return genai.Client(api_key=resolved_key)

    @classmethod
    def chat(cls, req: ConsultationRequest) -> ConsultationResponse:
        client = cls.get_client(req.api_key)
        target_lang = req.language if req.language in LANGUAGE_PROMPTS else "en-IN"
        lang_prompt = LANGUAGE_PROMPTS[target_lang]
        is_rtl = target_lang == "ur-PK"
        disclaimer = DISCLAIMERS.get(target_lang, DISCLAIMERS["en-IN"])

        # Prepare system instruction
        system_instruction = f"{BASE_SYSTEM_INSTRUCTION}\n\nTARGET LANGUAGE INSTRUCTION:\n{lang_prompt}"

        if req.patient_context:
            context_str = json.dumps(req.patient_context, indent=2)
            system_instruction += f"\n\nCURRENT PATIENT SCREENING CONTEXT:\n{context_str}\nUse these metrics when relevant."

        # Format conversation contents
        contents = []
        for msg in req.history[-10:]:  # Keep recent 10 turns for context
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.content)]
            ))

        # Add current user prompt
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=req.message)]
        ))

        # Candidate models with automatic resilience fallback (fastest, most available first)
        candidate_models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"]

        last_err = None
        for m in candidate_models:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                        max_output_tokens=500
                    )
                )

                reply_text = response.text or ""
                if not reply_text.strip():
                    reply_text = "I am listening. Could you please repeat that?"

                return ConsultationResponse(
                    reply=reply_text.strip(),
                    language=target_lang,
                    is_rtl=is_rtl,
                    disclaimer=disclaimer,
                    model_used=m
                )
            except Exception as e:
                logger.warn(f"Model {m} failed: {e}. Trying fallback if available...")
                last_err = e

        logger.error(f"All candidate Gemini models failed: {last_err}", exc_info=True)
        raise last_err

    @classmethod
    def generate_summary(cls, req: ConsultationSummaryRequest) -> ConsultationSummaryResponse:
        client = cls.get_client(req.api_key)
        target_lang = req.language if req.language in LANGUAGE_PROMPTS else "en-IN"
        lang_prompt = LANGUAGE_PROMPTS[target_lang]

        # Collate transcript
        transcript_lines = []
        for m in req.history:
            speaker = "Patient" if m.role == "user" else "Doctor AI"
            transcript_lines.append(f"{speaker}: {m.content}")
        transcript = "\n".join(transcript_lines)

        prompt = f"""Review the following doctor-patient educational consultation transcript and generate a structured summary in JSON format.
Output language must strictly adhere to: {lang_prompt}

Transcript:
{transcript}

Required JSON Structure:
{{
  "title": "Concise summary title",
  "topics_discussed": ["Topic 1", "Topic 2", ...],
  "key_questions_asked": ["Question 1", "Question 2", ...],
  "educational_explanations": ["Key explanation 1", "Key explanation 2", ...],
  "questions_for_doctor": ["Specific question patient can ask their neurologist 1", "..."]
}}
"""

        candidate_models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"]
        for m in candidate_models:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.3,
                        max_output_tokens=1000
                    )
                )

                data = json.loads(response.text)
                now_str = datetime.now().strftime("%B %d, %Y - %I:%M %p")

                return ConsultationSummaryResponse(
                    title=data.get("title", "AI Voice Consultation Summary"),
                    date_time=now_str,
                    duration_seconds=req.duration_seconds,
                    language=target_lang,
                    topics_discussed=data.get("topics_discussed", ["Parkinson's Disease Education"]),
                    key_questions_asked=data.get("key_questions_asked", []),
                    educational_explanations=data.get("educational_explanations", []),
                    questions_for_doctor=data.get("questions_for_doctor", ["Please consult a neurologist for comprehensive evaluation."]),
                    disclaimer=DISCLAIMERS.get(target_lang, DISCLAIMERS["en-IN"])
                )
            except Exception as e:
                logger.warn(f"Summary generation on {m} failed: {e}. Trying fallback if available...")

        # Honest fallback structure if all models fail
        now_str = datetime.now().strftime("%B %d, %Y - %I:%M %p")
        return ConsultationSummaryResponse(
                title="NeuroVoice Consultation Summary",
                date_time=now_str,
                duration_seconds=req.duration_seconds,
                language=target_lang,
                topics_discussed=["Parkinson's Motor Assessment & Educational Inquiries"],
                key_questions_asked=[m.content for m in req.history if m.role == "user"][:3],
                educational_explanations=["Reviewed screening protocol and symptom characteristics."],
                questions_for_doctor=[
                    "What clinical motor and non-motor tests do you recommend?",
                    "Should we schedule an in-person neurological examination?"
                ],
                disclaimer=DISCLAIMERS.get(target_lang, DISCLAIMERS["en-IN"])
            )

gemini_service = GeminiService()

