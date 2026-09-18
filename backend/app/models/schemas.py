from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SourceType(str, Enum):
    YOUTUBE = "youtube"
    UPLOAD = "upload"

class MeetingStatus(str, Enum):
    PENDING = "pending"
    INGESTING = "ingesting"
    NORMALIZING = "normalizing"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    INDEXING = "indexing"
    READY = "ready"
    FAILED = "failed"

class LanguageOption(str, Enum):
    AUTO = "auto"
    ENGLISH = "en"
    HINDI = "hi"
    HINGLISH = "hi-en"

class PersonaType(str, Enum):
    GENERAL = "general"
    RECRUITER = "recruiter"
    PROJECT_MANAGER = "project_manager"
    ACADEMIC = "academic"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ActionItem(BaseModel):
    id: Optional[str] = None
    task: str
    owner: Optional[str] = "Unassigned"
    priority: Priority = Priority.MEDIUM
    due_date: Optional[str] = None
    completed: bool = False

class DecisionItem(BaseModel):
    id: Optional[str] = None
    decision: str
    rationale: Optional[str] = None
    made_by: Optional[str] = None

class QuestionItem(BaseModel):
    id: Optional[str] = None
    question: str
    context: Optional[str] = None
    status: Optional[str] = "open"

class PersonaInsights(BaseModel):
    persona: PersonaType = PersonaType.GENERAL
    scorecard: Optional[Dict[str, Any]] = None  # e.g. for recruiter: technical_competence, communication, flags
    pm_tracking: Optional[Dict[str, Any]] = None  # blockers, sprint_alignment, deliverables
    academic_notes: Optional[Dict[str, Any]] = None  # core_theories, definitions, references

class TranscriptSegment(BaseModel):
    id: int
    start_time: float
    end_time: float
    start_str: str  # e.g. "02:15"
    speaker: Optional[str] = "Speaker"
    text: str

class MeetingSummary(BaseModel):
    executive_summary: str
    bullet_points: List[str] = []
    decisions: List[DecisionItem] = []
    action_items: List[ActionItem] = []
    open_questions: List[QuestionItem] = []
    topics: List[str] = []
    sentiment: Optional[str] = "Neutral"
    persona_insights: Optional[PersonaInsights] = None

class MeetingCreateRequest(BaseModel):
    title: Optional[str] = None
    source_type: SourceType
    youtube_url: Optional[str] = None
    language: LanguageOption = LanguageOption.AUTO
    persona: PersonaType = PersonaType.GENERAL
    tags: List[str] = []

class Meeting(BaseModel):
    id: str
    title: str
    source_type: SourceType
    source_url: Optional[str] = None
    audio_path: Optional[str] = None
    duration_seconds: float = 0.0
    duration_str: str = "00:00"
    language: str = "en"
    detected_language: Optional[str] = None
    status: MeetingStatus = MeetingStatus.PENDING
    progress_pct: int = 0
    stage_message: str = "Initialized"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []
    persona: PersonaType = PersonaType.GENERAL
    summary: Optional[MeetingSummary] = None
    transcript: List[TranscriptSegment] = []
    error_message: Optional[str] = None

class Citation(BaseModel):
    segment_id: Optional[int] = None
    start_time: float
    end_time: float
    timestamp_str: str
    text_snippet: str
    score: Optional[float] = None

class ChatMessage(BaseModel):
    id: str
    meeting_id: str
    role: str  # "user" | "assistant"
    content: str
    citations: List[Citation] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    message: str
    meeting_id: Optional[str] = None  # If None, global cross-meeting query
    persona: Optional[PersonaType] = PersonaType.GENERAL

class ChatResponse(BaseModel):
    message: str
    citations: List[Citation] = []
    meeting_id: Optional[str] = None

class SettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None
    mistral_model: Optional[str] = None

class SystemStatus(BaseModel):
    app_name: str
    version: str
    ffmpeg_installed: bool
    openai_configured: bool
    sarvam_configured: bool
    mistral_configured: bool
    huggingface_configured: bool
    chromadb_ready: bool
    total_meetings: int

