import json
import logging
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from backend.app.core.config import settings
from backend.app.schemas.consultation import (
    ConsultationRequest,
    ConsultationResponse,
    ConsultationSummaryRequest,
    ConsultationSummaryResponse,
    ConsultationConfigResponse,
    ChatMessage
)
from backend.app.services.gemini_service import (
    gemini_service,
    SUPPORTED_LANGUAGES,
    DISCLAIMERS
)

logger = logging.getLogger("parkinsons_app.consultation")
router = APIRouter(prefix="/consultation", tags=["Voice Consultation"])

@router.get("/config", response_model=ConsultationConfigResponse)
def get_consultation_config():
    """Returns availability of server-configured Gemini API key and language options."""
    has_key = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    return ConsultationConfigResponse(
        server_key_configured=has_key,
        default_model=settings.GEMINI_MODEL,
        supported_languages=SUPPORTED_LANGUAGES
    )

@router.post("/chat", response_model=ConsultationResponse)
def chat_consultation(req: ConsultationRequest):
    """Processes a user consultation turn and returns Gemini AI conversational reply."""
    try:
        return gemini_service.chat(req)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Error in chat_consultation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API service communication failure: {str(e)}"
        )

@router.post("/summary", response_model=ConsultationSummaryResponse)
def generate_consultation_summary(req: ConsultationSummaryRequest):
    """Generates an educational clinical summary of the consultation."""
    try:
        return gemini_service.generate_summary(req)
    except Exception as e:
        logger.error(f"Error generating consultation summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate consultation summary: {str(e)}"
        )

@router.websocket("/live")
async def websocket_live_consultation(websocket: WebSocket):
    """
    Real-time interactive WebSocket channel for live consultation dialog.
    Accepts text or audio transcription events and streams back AI responses with status updates.
    """
    await websocket.accept()
    history = []
    current_lang = "en-IN"
    api_key = None

    try:
        # Send initial handshake confirmation
        await websocket.send_json({
            "type": "handshake",
            "status": "ready",
            "message": "Connected to NeuroVoice Live AI Consultation Engine"
        })

        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                continue

            event_type = data.get("type")

            if event_type == "configure":
                current_lang = data.get("language", current_lang)
                if data.get("api_key"):
                    api_key = data.get("api_key")
                await websocket.send_json({
                    "type": "configured",
                    "language": current_lang
                })

            elif event_type == "user_utterance":
                user_text = data.get("text", "").strip()
                if not user_text:
                    continue

                # Notify client that assistant is processing
                await websocket.send_json({
                    "type": "assistant_state",
                    "state": "PROCESSING"
                })

                history.append(ChatMessage(role="user", content=user_text))

                req = ConsultationRequest(
                    message=user_text,
                    language=current_lang,
                    history=history[:-1],
                    patient_context=data.get("patient_context"),
                    api_key=api_key or data.get("api_key")
                )

                try:
                    res = gemini_service.chat(req)
                    history.append(ChatMessage(role="model", content=res.reply))

                    # Send response to client
                    await websocket.send_json({
                        "type": "assistant_state",
                        "state": "SPEAKING"
                    })
                    await websocket.send_json({
                        "type": "ai_response",
                        "reply": res.reply,
                        "language": res.language,
                        "is_rtl": res.is_rtl,
                        "disclaimer": res.disclaimer
                    })
                except Exception as err:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(err)
                    })
                    await websocket.send_json({
                        "type": "assistant_state",
                        "state": "READY"
                    })

    except WebSocketDisconnect:
        logger.info("Live consultation websocket disconnected.")
    except Exception as e:
        logger.error(f"Live consultation websocket exception: {e}")
        try:
            await websocket.close()
        except:
            pass
