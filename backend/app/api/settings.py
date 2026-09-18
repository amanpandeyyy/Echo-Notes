import os
import shutil
import requests
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Body
from app.config import settings
from app.models.schemas import SettingsUpdate, SystemStatus
from app.services.storage import get_setting, set_setting, list_meetings

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SystemStatus)
def get_system_status():
    ffmpeg_exists = shutil.which("ffmpeg") is not None
    
    openai_key = get_setting("OPENAI_API_KEY") or settings.OPENAI_API_KEY
    sarvam_key = get_setting("SARVAM_API_KEY") or settings.SARVAM_API_KEY
    mistral_key = get_setting("MISTRAL_API_KEY") or settings.MISTRAL_API_KEY
    hf_key = get_setting("HUGGINGFACE_API_KEY") or settings.HUGGINGFACE_API_KEY
    
    total_meetings = len(list_meetings())
    
    return SystemStatus(
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        ffmpeg_installed=ffmpeg_exists,
        openai_configured=bool(openai_key),
        sarvam_configured=bool(sarvam_key),
        mistral_configured=bool(mistral_key),
        huggingface_configured=bool(hf_key),
        chromadb_ready=True,
        total_meetings=total_meetings
    )

@router.get("/keys")
def get_current_keys():
    """Returns masked keys for UI security."""
    def mask_key(k: Optional[str]) -> str:
        if not k or len(k) < 6:
            return ""
        return f"{k[:4]}••••••••{k[-3:]}"
        
    return {
        "openai_api_key_masked": mask_key(get_setting("OPENAI_API_KEY") or settings.OPENAI_API_KEY),
        "sarvam_api_key_masked": mask_key(get_setting("SARVAM_API_KEY") or settings.SARVAM_API_KEY),
        "mistral_api_key_masked": mask_key(get_setting("MISTRAL_API_KEY") or settings.MISTRAL_API_KEY),
        "huggingface_api_key_masked": mask_key(get_setting("HUGGINGFACE_API_KEY") or settings.HUGGINGFACE_API_KEY),
        "mistral_model": get_setting("MISTRAL_MODEL") or settings.MISTRAL_MODEL
    }

@router.post("/keys")
def update_keys(payload: SettingsUpdate):
    if payload.openai_api_key is not None:
        set_setting("OPENAI_API_KEY", payload.openai_api_key.strip())
    if payload.sarvam_api_key is not None:
        set_setting("SARVAM_API_KEY", payload.sarvam_api_key.strip())
    if payload.mistral_api_key is not None:
        set_setting("MISTRAL_API_KEY", payload.mistral_api_key.strip())
    if payload.huggingface_api_key is not None:
        set_setting("HUGGINGFACE_API_KEY", payload.huggingface_api_key.strip())
    if payload.mistral_model is not None:
        set_setting("MISTRAL_MODEL", payload.mistral_model.strip())
        
    return {"status": "success", "message": "API keys updated successfully"}

@router.post("/test/{provider}")
def test_provider_connection(provider: str, key: Optional[str] = Body(None, embed=True)):
    """Tests connection to the specified AI provider API."""
    provider_lower = provider.lower()
    
    if provider_lower == "mistral":
        api_key = key or get_setting("MISTRAL_API_KEY") or settings.MISTRAL_API_KEY
        if not api_key:
            return {"success": False, "message": "No Mistral API key provided"}
        try:
            res = requests.get(
                "https://api.mistral.ai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if res.status_code == 200:
                return {"success": True, "message": "Mistral AI connection verified! Models available."}
            return {"success": False, "message": f"Mistral API returned status {res.status_code}: {res.text}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    elif provider_lower == "openai":
        api_key = key or get_setting("OPENAI_API_KEY") or settings.OPENAI_API_KEY
        if not api_key:
            return {"success": False, "message": "No OpenAI API key provided"}
        try:
            res = requests.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if res.status_code == 200:
                return {"success": True, "message": "OpenAI Whisper connection verified!"}
            return {"success": False, "message": f"OpenAI API returned status {res.status_code}: {res.text}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    elif provider_lower == "sarvam":
        api_key = key or get_setting("SARVAM_API_KEY") or settings.SARVAM_API_KEY
        if not api_key:
            return {"success": False, "message": "No Sarvam AI API key provided"}
        try:
            # Check authentication with Sarvam speech-to-text endpoint
            res = requests.post(
                "https://api.sarvam.ai/speech-to-text",
                headers={"api-subscription-key": api_key},
                timeout=10.0
            )
            # A 400 (body.file required) confirms valid authentication key
            if res.status_code in [200, 400]:
                return {"success": True, "message": "Sarvam AI connection verified (Saarika v2.5 speech ready)!"}
            elif res.status_code in [401, 403]:
                return {"success": False, "message": "Invalid Sarvam AI subscription key"}
            return {"success": True, "message": "Sarvam AI key accepted"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    elif provider_lower == "huggingface":
        api_key = key or get_setting("HUGGINGFACE_API_KEY") or settings.HUGGINGFACE_API_KEY
        if not api_key:
            return {"success": False, "message": "No Hugging Face token provided"}
        try:
            res = requests.get(
                "https://huggingface.co/api/whoami-v2",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if res.status_code == 200:
                username = res.json().get("name", "User")
                return {"success": True, "message": f"Hugging Face authenticated as @{username}"}
            return {"success": False, "message": f"Hugging Face returned status {res.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

