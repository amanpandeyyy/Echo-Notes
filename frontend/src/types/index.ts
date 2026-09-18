export type SourceType = 'youtube' | 'upload';

export type MeetingStatus =
  | 'pending'
  | 'ingesting'
  | 'normalizing'
  | 'transcribing'
  | 'analyzing'
  | 'indexing'
  | 'ready'
  | 'failed';

export type LanguageOption = 'auto' | 'en' | 'hi' | 'hi-en';

export type PersonaType = 'general' | 'recruiter' | 'project_manager' | 'academic';

export type Priority = 'low' | 'medium' | 'high';

export interface ActionItem {
  id: string;
  task: string;
  owner?: string;
  priority: Priority;
  due_date?: string;
  completed: boolean;
}

export interface DecisionItem {
  id: string;
  decision: string;
  rationale?: string;
  made_by?: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  context?: string;
  status?: string;
}

export interface PersonaInsights {
  persona: PersonaType;
  scorecard?: Record<string, any>;
  pm_tracking?: Record<string, any>;
  academic_notes?: Record<string, any>;
}

export interface TranscriptSegment {
  id: number;
  start_time: number;
  end_time: number;
  start_str: string;
  speaker?: string;
  text: string;
}

export interface MeetingSummary {
  executive_summary: string;
  bullet_points: string[];
  decisions: DecisionItem[];
  action_items: ActionItem[];
  open_questions: QuestionItem[];
  topics: string[];
  sentiment?: string;
  persona_insights?: PersonaInsights;
}

export interface Meeting {
  id: string;
  title: string;
  source_type: SourceType;
  source_url?: string;
  audio_path?: string;
  duration_seconds: number;
  duration_str: string;
  language: string;
  detected_language?: string;
  status: MeetingStatus;
  progress_pct: number;
  stage_message: string;
  created_at: string;
  tags: string[];
  persona: PersonaType;
  summary?: MeetingSummary;
  transcript: TranscriptSegment[];
  error_message?: string;
}

export interface Citation {
  segment_id?: number;
  start_time: number;
  end_time: number;
  timestamp_str: string;
  text_snippet: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  meeting_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface SystemStatus {
  app_name: string;
  version: string;
  ffmpeg_installed: boolean;
  openai_configured: boolean;
  sarvam_configured: boolean;
  mistral_configured: boolean;
  huggingface_configured: boolean;
  chromadb_ready: boolean;
  total_meetings: number;
}

