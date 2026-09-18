import os
import uuid
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from app.config import settings
from app.models.schemas import (
    Meeting, MeetingStatus, SourceType, LanguageOption,
    PersonaType, MeetingCreateRequest
)
from app.services.storage import (
    save_meeting, update_meeting_progress, get_meeting, format_duration
)
from app.services.ingestion import (
    download_youtube_audio, normalize_audio, validate_audio_video_extension,
    get_media_duration_ffmpeg
)
from app.services.transcription import transcribe_audio_pipeline
from app.services.nlp import analyze_meeting_nlp
from app.services.vectorstore import index_meeting_transcript

router = APIRouter(prefix="/ingest", tags=["ingest"])

def process_pipeline_background(meeting_id: str):
    """
    Executes the 6-stage meeting processing pipeline in a background thread.
    """
    meeting = get_meeting(meeting_id)
    if not meeting:
        return

    try:
        raw_audio_path = meeting.audio_path
        norm_audio_path = None
        
        pre_extracted_segments = None
        
        # Stage 1: Ingestion
        if meeting.source_type == SourceType.YOUTUBE:
            update_meeting_progress(meeting_id, MeetingStatus.INGESTING, 15, "Fetching YouTube audio & native subtitles via yt-dlp...")
            yt_res = download_youtube_audio(meeting.source_url)
            raw_audio_path = yt_res["raw_audio_path"]
            norm_audio_path = yt_res["normalized_audio_path"]
            meeting.duration_seconds = yt_res["duration_seconds"]
            meeting.duration_str = format_duration(meeting.duration_seconds)
            meeting.audio_path = norm_audio_path
            if not meeting.title or meeting.title == "YouTube Meeting":
                meeting.title = yt_res["title"]
            pre_extracted_segments = yt_res.get("transcript")
            save_meeting(meeting)
        else:
            update_meeting_progress(meeting_id, MeetingStatus.INGESTING, 20, "Uploaded media stream validated.")

        # Stage 2: FFmpeg Normalization
        if not norm_audio_path:
            update_meeting_progress(meeting_id, MeetingStatus.NORMALIZING, 35, "FFmpeg normalizing audio to 16kHz mono...")
            norm_audio_path, duration = normalize_audio(raw_audio_path)
            meeting.duration_seconds = duration
            meeting.duration_str = format_duration(duration)
            meeting.audio_path = norm_audio_path
            save_meeting(meeting)
            
        # Stage 3: Transcription
        if pre_extracted_segments and len(pre_extracted_segments) > 0:
            update_meeting_progress(meeting_id, MeetingStatus.TRANSCRIBING, 60, f"Captured {len(pre_extracted_segments)} genuine speech segments from YouTube...")
            segments = pre_extracted_segments
            detected_lang = meeting.language if meeting.language != "auto" else "en"
        else:
            update_meeting_progress(meeting_id, MeetingStatus.TRANSCRIBING, 60, f"Transcribing speech using {meeting.language.upper()} engine...")
            segments, detected_lang = transcribe_audio_pipeline(
                audio_path=norm_audio_path or raw_audio_path,
                language=meeting.language,
                title=meeting.title,
                duration_seconds=meeting.duration_seconds,
                pre_extracted_segments=pre_extracted_segments
            )
        meeting.transcript = segments
        meeting.detected_language = detected_lang
        save_meeting(meeting)

        # Stage 4: NLP & Structured Summarization
        update_meeting_progress(meeting_id, MeetingStatus.ANALYZING, 80, "Extracting executive summary, decisions, and action items via Mistral AI...")
        summary = analyze_meeting_nlp(
            transcript=segments,
            persona=meeting.persona,
            meeting_title=meeting.title
        )
        meeting.summary = summary
        save_meeting(meeting)

        # Stage 5: Vector Indexing in ChromaDB
        update_meeting_progress(meeting_id, MeetingStatus.INDEXING, 95, "Generating Hugging Face embeddings and indexing in ChromaDB...")
        index_meeting_transcript(meeting_id, segments)

        # Stage 6: Ready
        update_meeting_progress(meeting_id, MeetingStatus.READY, 100, "Intelligence Ready & Grounded RAG Online")
        print(f"[Pipeline] Successfully processed meeting {meeting_id}")

    except Exception as e:
        print(f"[Pipeline] Error processing meeting {meeting_id}: {e}")
        update_meeting_progress(
            meeting_id,
            MeetingStatus.FAILED,
            0,
            "Processing failed",
            error_message=str(e)
        )

@router.post("/youtube", response_model=Meeting)
def ingest_youtube_endpoint(payload: MeetingCreateRequest, background_tasks: BackgroundTasks):
    if not payload.youtube_url:
        raise HTTPException(status_code=400, detail="YouTube URL is required")
        
    meeting_id = f"m-{uuid.uuid4().hex[:8]}"
    meeting = Meeting(
        id=meeting_id,
        title=payload.title or "YouTube Meeting",
        source_type=SourceType.YOUTUBE,
        source_url=payload.youtube_url,
        language=payload.language.value,
        persona=payload.persona,
        tags=payload.tags,
        status=MeetingStatus.PENDING,
        progress_pct=5,
        stage_message="Queued for ingestion",
        created_at=datetime.utcnow()
    )
    
    save_meeting(meeting)
    background_tasks.add_task(process_pipeline_background, meeting_id)
    return meeting

@router.post("/upload", response_model=Meeting)
async def ingest_upload_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    language: str = Form("auto"),
    persona: str = Form("general"),
    tags: Optional[str] = Form("")
):
    if not validate_audio_video_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Supported formats: .mp3, .mp4, .wav, .m4a, .webm, .mov, .flac"
        )
        
    meeting_id = f"m-{uuid.uuid4().hex[:8]}"
    safe_filename = f"{meeting_id}_{file.filename}"
    save_path = settings.UPLOADS_DIR / safe_filename
    
    with open(save_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
            
    parsed_tags = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    display_title = title.strip() if title and title.strip() else Path(file.filename).stem.replace("_", " ").title()
    
    persona_type = PersonaType.GENERAL
    try:
        persona_type = PersonaType(persona)
    except Exception:
        pass
        
    meeting = Meeting(
        id=meeting_id,
        title=display_title,
        source_type=SourceType.UPLOAD,
        source_url=file.filename,
        audio_path=str(save_path),
        language=language,
        persona=persona_type,
        tags=parsed_tags,
        status=MeetingStatus.PENDING,
        progress_pct=5,
        stage_message="File uploaded. Queued for normalization.",
        created_at=datetime.utcnow()
    )
    
    save_meeting(meeting)
    background_tasks.add_task(process_pipeline_background, meeting_id)
    return meeting

