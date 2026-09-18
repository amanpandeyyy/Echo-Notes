import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models.schemas import (
    Meeting, MeetingStatus, SourceType, PersonaType, Priority,
    MeetingSummary, TranscriptSegment, ActionItem, DecisionItem,
    QuestionItem, PersonaInsights, ChatMessage, Citation
)

DB_PATH = settings.DATA_DIR / "echo_notes.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_url TEXT,
        audio_path TEXT,
        duration_seconds REAL DEFAULT 0.0,
        duration_str TEXT DEFAULT '00:00',
        language TEXT DEFAULT 'en',
        detected_language TEXT,
        status TEXT DEFAULT 'pending',
        progress_pct INTEGER DEFAULT 0,
        stage_message TEXT DEFAULT 'Initialized',
        created_at TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        persona TEXT DEFAULT 'general',
        summary_json TEXT,
        transcript_json TEXT,
        error_message TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        meeting_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        citations_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)

    conn.commit()
    conn.close()
    
    seed_initial_data()

def format_duration(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    if mins >= 60:
        hrs = mins // 60
        mins = mins % 60
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

def save_meeting(meeting: Meeting) -> Meeting:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    summary_json = meeting.summary.model_dump_json() if meeting.summary else None
    transcript_json = json.dumps([t.model_dump() for t in meeting.transcript]) if meeting.transcript else "[]"
    tags_json = json.dumps(meeting.tags)
    
    cursor.execute("""
    INSERT INTO meetings (
        id, title, source_type, source_url, audio_path,
        duration_seconds, duration_str, language, detected_language,
        status, progress_pct, stage_message, created_at, tags,
        persona, summary_json, transcript_json, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        source_type = excluded.source_type,
        source_url = excluded.source_url,
        audio_path = excluded.audio_path,
        duration_seconds = excluded.duration_seconds,
        duration_str = excluded.duration_str,
        language = excluded.language,
        detected_language = excluded.detected_language,
        status = excluded.status,
        progress_pct = excluded.progress_pct,
        stage_message = excluded.stage_message,
        tags = excluded.tags,
        persona = excluded.persona,
        summary_json = excluded.summary_json,
        transcript_json = excluded.transcript_json,
        error_message = excluded.error_message;
    """, (
        meeting.id,
        meeting.title,
        meeting.source_type.value if hasattr(meeting.source_type, 'value') else str(meeting.source_type),
        meeting.source_url,
        meeting.audio_path,
        meeting.duration_seconds,
        meeting.duration_str,
        meeting.language,
        meeting.detected_language,
        meeting.status.value if hasattr(meeting.status, 'value') else str(meeting.status),
        meeting.progress_pct,
        meeting.stage_message,
        meeting.created_at.isoformat(),
        tags_json,
        meeting.persona.value if hasattr(meeting.persona, 'value') else str(meeting.persona),
        summary_json,
        transcript_json,
        meeting.error_message
    ))
    
    conn.commit()
    conn.close()
    return meeting

def update_meeting_progress(meeting_id: str, status: MeetingStatus, progress_pct: int, stage_message: str, error_message: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE meetings
    SET status = ?, progress_pct = ?, stage_message = ?, error_message = ?
    WHERE id = ?
    """, (
        status.value if hasattr(status, 'value') else str(status),
        progress_pct,
        stage_message,
        error_message,
        meeting_id
    ))
    conn.commit()
    conn.close()

def get_meeting(meeting_id: str) -> Optional[Meeting]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    return _row_to_meeting(row)

def list_meetings(
    search: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    persona: Optional[str] = None
) -> List[Meeting]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM meetings WHERE 1=1"
    params = []
    
    if search:
        query += " AND (title LIKE ? OR tags LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    if language and language != "all":
        query += " AND (language = ? OR detected_language = ?)"
        params.extend([language, language])
    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
    if persona and persona != "all":
        query += " AND persona = ?"
        params.append(persona)
        
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [_row_to_meeting(r) for r in rows]

def delete_meeting(meeting_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    cursor.execute("DELETE FROM chat_messages WHERE meeting_id = ?", (meeting_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def toggle_action_item(meeting_id: str, action_item_id: str, completed: Optional[bool] = None) -> Optional[Meeting]:
    meeting = get_meeting(meeting_id)
    if not meeting or not meeting.summary:
        return None
    
    found = False
    for item in meeting.summary.action_items:
        if item.id == action_item_id or item.task == action_item_id:
            item.completed = not item.completed if completed is None else completed
            found = True
            break
            
    if found:
        save_meeting(meeting)
    return meeting

def update_action_item(meeting_id: str, action_item_id: str, data: Dict[str, Any]) -> Optional[Meeting]:
    meeting = get_meeting(meeting_id)
    if not meeting or not meeting.summary:
        return None
        
    for item in meeting.summary.action_items:
        if item.id == action_item_id or item.task == action_item_id:
            if "owner" in data:
                item.owner = data["owner"]
            if "priority" in data:
                item.priority = data["priority"]
            if "due_date" in data:
                item.due_date = data["due_date"]
            if "completed" in data:
                item.completed = data["completed"]
            break
            
    save_meeting(meeting)
    return meeting

def save_chat_message(meeting_id: Optional[str], role: str, content: str, citations: List[Citation] = []) -> ChatMessage:
    conn = get_db_connection()
    cursor = conn.cursor()
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    citations_json = json.dumps([c.model_dump() for c in citations])
    
    cursor.execute("""
    INSERT INTO chat_messages (id, meeting_id, role, content, citations_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (msg_id, meeting_id or "global", role, content, citations_json, now.isoformat()))
    
    conn.commit()
    conn.close()
    
    return ChatMessage(
        id=msg_id,
        meeting_id=meeting_id or "global",
        role=role,
        content=content,
        citations=citations,
        created_at=now
    )

def get_chat_history(meeting_id: Optional[str], limit: int = 50) -> List[ChatMessage]:
    conn = get_db_connection()
    cursor = conn.cursor()
    target_id = meeting_id or "global"
    
    cursor.execute("""
    SELECT * FROM chat_messages
    WHERE meeting_id = ?
    ORDER BY created_at ASC
    LIMIT ?
    """, (target_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    messages = []
    for r in rows:
        c_list = []
        try:
            raw_citations = json.loads(r["citations_json"])
            c_list = [Citation(**c) for c in raw_citations]
        except Exception:
            c_list = []
            
        messages.append(ChatMessage(
            id=r["id"],
            meeting_id=r["meeting_id"],
            role=r["role"],
            content=r["content"],
            citations=c_list,
            created_at=datetime.fromisoformat(r["created_at"])
        ))
    return messages

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, value))
    conn.commit()
    conn.close()

def _row_to_meeting(row: sqlite3.Row) -> Meeting:
    tags = []
    try:
        tags = json.loads(row["tags"]) if row["tags"] else []
    except Exception:
        tags = []
        
    summary = None
    if row["summary_json"]:
        try:
            s_dict = json.loads(row["summary_json"])
            summary = MeetingSummary(**s_dict)
        except Exception:
            summary = None
            
    transcript = []
    if row["transcript_json"]:
        try:
            t_list = json.loads(row["transcript_json"])
            transcript = [TranscriptSegment(**t) for t in t_list]
        except Exception:
            transcript = []
            
    return Meeting(
        id=row["id"],
        title=row["title"],
        source_type=SourceType(row["source_type"]),
        source_url=row["source_url"],
        audio_path=row["audio_path"],
        duration_seconds=row["duration_seconds"],
        duration_str=row["duration_str"],
        language=row["language"],
        detected_language=row["detected_language"],
        status=MeetingStatus(row["status"]),
        progress_pct=row["progress_pct"],
        stage_message=row["stage_message"],
        created_at=datetime.fromisoformat(row["created_at"]),
        tags=tags,
        persona=PersonaType(row["persona"]) if row["persona"] else PersonaType.GENERAL,
        summary=summary,
        transcript=transcript,
        error_message=row["error_message"]
    )

def seed_initial_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM meetings")
    count = cursor.fetchone()["count"]
    conn.close()
    
    if count > 0:
        return

    # Seed 3 high-quality realistic preloaded meetings
    sample_1 = Meeting(
        id="sample-eng-q3-sync",
        title="Q3 Engineering Roadmap & Tech Debt Review",
        source_type=SourceType.UPLOAD,
        source_url="meeting_recording_2026_q3_eng.mp4",
        duration_seconds=1680.0,
        duration_str="28:00",
        language="en",
        detected_language="en",
        status=MeetingStatus.READY,
        progress_pct=100,
        stage_message="Analysis & Indexing Complete",
        created_at=datetime.utcnow(),
        tags=["Engineering", "Roadmap", "Microservices", "Tech Debt", "Q3"],
        persona=PersonaType.PROJECT_MANAGER,
        summary=MeetingSummary(
            executive_summary="The engineering leadership team reviewed the Q3 delivery milestones, addressing critical microservice latency bottlenecks in the payment gateway and establishing a 2-week migration plan to Redis caching with unified OpenTelemetry distributed tracing.",
            bullet_points=[
                "Payment gateway P99 latency degraded to 420ms due to unindexed database queries during peak checkout hours.",
                "Agreed to introduce Redis cluster caching for session and idempotency validation, targeting under 85ms P99.",
                "Migration to OpenTelemetry will unify logging and distributed traces across all 14 backend microservices.",
                "Security compliance audit requires rotating all production JWT signing keys by end of month."
            ],
            decisions=[
                DecisionItem(id="d-1", decision="Adopt Redis Cluster for high-throughput session caching", rationale="Reduces primary DB read IOPS by 65% and guarantees <100ms P99 SLA.", made_by="Alex Rivera (Principal Architect)"),
                DecisionItem(id="d-2", decision="Standardize on OpenTelemetry for all microservice telemetry", rationale="Eliminates vendor lock-in and provides single-pane observability.", made_by="Priya Patel (VP of Engineering)")
            ],
            action_items=[
                ActionItem(id="a-1", task="Deploy Redis Cluster staging instance and run load benchmark with k6", owner="DevOps Team (Marcus)", priority=Priority.HIGH, due_date="Next Tuesday", completed=False),
                ActionItem(id="a-2", task="Instrument OpenTelemetry spans in payment service repository", owner="Elena Rostova", priority=Priority.HIGH, due_date="Friday EOD", completed=True),
                ActionItem(id="a-3", task="Rotate production JWT keys and update auth sidecar configuration", owner="Security Team (Kenji)", priority=Priority.MEDIUM, due_date="End of Month", completed=False),
                ActionItem(id="a-4", task="Draft RFC on async event publishing for notification bus", owner="Alex Rivera", priority=Priority.LOW, due_date="Next Sprint", completed=False)
            ],
            open_questions=[
                QuestionItem(id="q-1", question="Should we self-host Redis on Kubernetes using Strimzi/Operator or use AWS ElastiCache?", context="Cost analysis pending between Cloud Ops and Finance.", status="open"),
                QuestionItem(id="q-2", question="What is the rollback procedure if legacy clients fail with rotated JWT headers?", context="Requires staging canary verification with mobile app v4.2.", status="open")
            ],
            topics=["Architecture", "Caching", "Latency", "Observability", "Security"],
            persona_insights=PersonaInsights(
                persona=PersonaType.PROJECT_MANAGER,
                pm_tracking={
                    "sprint_velocity_impact": "Medium (approx 8 story points dedicated to Redis refactor)",
                    "critical_path_blockers": "Redis staging environment provisioning required before Elena can run integration tests",
                    "milestone_completion_pct": 75,
                    "risk_assessment": "Low risk for core API, medium risk for backward compatibility on legacy iOS client JWT headers"
                }
            )
        ),
        transcript=[
            TranscriptSegment(id=1, start_time=0.0, end_time=14.0, start_str="00:00", speaker="Priya Patel", text="Good morning everyone. Let's kick off our Q3 engineering sync. Our primary focus today is resolving the payment latency spikes and locking down our tech debt priorities."),
            TranscriptSegment(id=2, start_time=14.5, end_time=38.0, start_str="00:14", speaker="Alex Rivera", text="Thanks Priya. Looking at DataDog metrics from last weekend's flash sale, our payment gateway P99 latency hit 420ms. The root cause is duplicate unindexed lookups against the main user table on every single idempotency check."),
            TranscriptSegment(id=3, start_time=38.5, end_time=65.0, start_str="00:38", speaker="Marcus Vance", text="Right, and running those against PostgreSQL directly is maxing out connection pool IOPS. If we put a Redis cluster in front of idempotency and active sessions, we can drop P99 to well below 85 milliseconds."),
            TranscriptSegment(id=4, start_time=65.5, end_time=92.0, start_str="01:05", speaker="Priya Patel", text="Agreed. Let's make that an official decision. Marcus, please spin up the Redis cluster in staging by Tuesday so Elena and Alex can benchmark it with k6."),
            TranscriptSegment(id=5, start_time=92.5, end_time=125.0, start_str="01:32", speaker="Elena Rostova", text="Sounds good. I will also instrument the payment service with OpenTelemetry spans by Friday so we get clear end-to-end trace waterfalls across the checkout journey."),
            TranscriptSegment(id=6, start_time=125.5, end_time=155.0, start_str="02:05", speaker="Kenji Sato", text="On the security side, reminder that our quarterly compliance audit requires rotating all production JWT signing keys before month end. I will coordinate the deployment with mobile and web teams.")
        ]
    )

    sample_2 = Meeting(
        id="sample-recruiter-ai-engineer",
        title="Technical Screen: Senior Staff AI & RAG Engineer (Candidate: Rohan Mehta)",
        source_type=SourceType.UPLOAD,
        source_url="interview_rohan_mehta_ai_staff.mp3",
        duration_seconds=1920.0,
        duration_str="32:00",
        language="hi-en",
        detected_language="hi-en",
        status=MeetingStatus.READY,
        progress_pct=100,
        stage_message="Analysis & Indexing Complete",
        created_at=datetime.utcnow(),
        tags=["Hiring", "Recruiting", "Hinglish", "AI", "Vector DB", "System Design"],
        persona=PersonaType.RECRUITER,
        summary=MeetingSummary(
            executive_summary="Deep technical interview with Rohan Mehta covering real-time multilingual RAG pipelines, quantization strategies, and ChromaDB/Milvus scaling at 50M+ vectors. Candidate demonstrated exceptional practical depth with production deployments.",
            bullet_points=[
                "Candidate has 7+ years of experience, currently leading LLM infrastructure at a Tier-1 tech scaleup.",
                "Explained hybrid sparse-dense retrieval (BM25 + BGE embeddings) with Cross-Encoder reranking for domain-specific medical and financial documents.",
                "Discussed Hinglish speech-to-text post-processing and phoneme alignment using Sarvam & Whisper architectures.",
                "Candidate is comfortable with 30-day notice period and looking for senior technical leadership."
            ],
            decisions=[
                DecisionItem(id="d-rec-1", decision="Advance candidate to Final Executive & Architecture Loop", rationale="Score 4.8/5.0 across System Design, Multilingual NLP, and Production Reliability.", made_by="Hiring Committee")
            ],
            action_items=[
                ActionItem(id="a-rec-1", task="Schedule 2x System Architecture interviews with VP of AI & CTO", owner="Recruiter (Ananya)", priority=Priority.HIGH, due_date="Tomorrow morning", completed=False),
                ActionItem(id="a-rec-2", task="Send candidate compensation expectations and equity overview package", owner="Talent Lead", priority=Priority.MEDIUM, due_date="Thursday", completed=False)
            ],
            open_questions=[
                QuestionItem(id="q-rec-1", question="Has candidate managed distributed teams across US and India timezones?", context="To be probed in leadership round.", status="open")
            ],
            topics=["Recruiting", "Generative AI", "RAG", "Embeddings", "Hinglish NLP"],
            persona_insights=PersonaInsights(
                persona=PersonaType.RECRUITER,
                scorecard={
                    "overall_recommendation": "STRONG HIRE (4.8 / 5.0)",
                    "technical_acumen": "Exceptional: demonstrated hands-on Triton server deployment & vLLM batching",
                    "communication_clarity": "Very high, effortlessly explained complex chunking trade-offs in English & Hinglish",
                    "culture_and_ownership": "Proactive, spearheaded latency reduction initiatives in current team",
                    "compensation_range": "$175,000 - $195,000 + Equity",
                    "notice_period": "30 days (negotiable)"
                }
            )
        ),
        transcript=[
            TranscriptSegment(id=1, start_time=0.0, end_time=20.0, start_str="00:00", speaker="Ananya Sharma", text="Hi Rohan, welcome to the technical interview for our Senior Staff AI Engineer position. Let's start with your recent work on high-scale RAG systems."),
            TranscriptSegment(id=2, start_time=20.5, end_time=55.0, start_str="00:20", speaker="Rohan Mehta", text="Sure Ananya. Basically in our current platform, humne hybrid search implement kiya tha. Hum dense embeddings (BGE-M3) ke saath BM25 lexical search combine karte hain with reciprocal rank fusion."),
            TranscriptSegment(id=3, start_time=55.5, end_time=90.0, start_str="00:55", speaker="Rohan Mehta", text="Isse Hinglish aur domain-specific terminologies mein retrieval accuracy lagbhag 34% improve hui. Production mein hum ChromaDB aur Milvus use karte hain with HNSW indexing for sub-20ms nearest neighbor queries."),
            TranscriptSegment(id=4, start_time=90.5, end_time=125.0, start_str="01:30", speaker="Ananya Sharma", text="That is very impressive Rohan. How did you handle audio chunking and speech transcription for Hindi/English code-switching in user voice inputs?"),
            TranscriptSegment(id=5, start_time=125.5, end_time=165.0, start_str="02:05", speaker="Rohan Mehta", text="We leveraged Sarvam AI's Saaras speech API for Indic phoneme preservation alongside Whisper with custom vocabulary biasing. Latency was optimized using streaming chunked WebSockets.")
        ]
    )

    sample_3 = Meeting(
        id="sample-academic-transformers",
        title="Stanford CS224N: Deep Dive into Multi-Head Attention & KV Cache Optimization",
        source_type=SourceType.YOUTUBE,
        source_url="https://www.youtube.com/watch?v=sample_transformer_lecture",
        duration_seconds=3120.0,
        duration_str="52:00",
        language="en",
        detected_language="en",
        status=MeetingStatus.READY,
        progress_pct=100,
        stage_message="Analysis & Indexing Complete",
        created_at=datetime.utcnow(),
        tags=["Academic", "Lecture", "Deep Learning", "Transformers", "NLP"],
        persona=PersonaType.ACADEMIC,
        summary=MeetingSummary(
            executive_summary="In-depth academic lecture breaking down Transformer scaled dot-product attention, multi-head projections, position embeddings (RoPE), FlashAttention v2 memory tiling, and KV cache reduction techniques like Grouped-Query Attention (GQA).",
            bullet_points=[
                "Scaled Dot-Product Attention scales by sqrt(d_k) to prevent softmax gradients from vanishing in high dimensions.",
                "Multi-Head Attention allows the model to jointly attend to information at different representation subspaces.",
                "Rotary Position Embeddings (RoPE) encode relative position as rotation in complex 2D planes, enabling length generalization.",
                "FlashAttention reorganizes matrix multiplication to compute attention in SRAM tiles, avoiding high-latency HBM memory read/writes.",
                "Grouped-Query Attention (GQA) reduces KV cache memory footprint by 8x with negligible loss in benchmark perplexity."
            ],
            decisions=[
                DecisionItem(id="d-acad-1", decision="Students must implement FlashAttention forward pass in Assignment 3", rationale="Hands-on GPU kernel concepts reinforce memory hierarchy understanding.", made_by="Prof. Christopher Manning")
            ],
            action_items=[
                ActionItem(id="a-acad-1", task="Submit Problem Set 2 on Positional Encodings & Attention Matrix Complexity", owner="All Students", priority=Priority.HIGH, due_date="Next Thursday 11:59 PM", completed=False),
                ActionItem(id="a-acad-2", task="Review Dao et al. 2023 FlashAttention-2 paper before next laboratory session", owner="Research Seminar Group", priority=Priority.MEDIUM, due_date="Monday", completed=False)
            ],
            open_questions=[
                QuestionItem(id="q-acad-1", question="How does FlashAttention-3 handle asynchronous Tensor Core pipelines on NVIDIA Hopper H100 architectures?", context="Topic for next week's advanced hardware lab.", status="open")
            ],
            topics=["Transformers", "Attention Mechanism", "FlashAttention", "KV Cache", "GQA", "RoPE"],
            persona_insights=PersonaInsights(
                persona=PersonaType.ACADEMIC,
                academic_notes={
                    "core_theories": ["Scaled Dot-Product Attention: softmax((Q * K^T)/sqrt(d_k)) * V", "Rotary Embeddings: R_Theta,m * x", "FlashAttention IO Complexity: O(N^2 * d / M)"],
                    "key_definitions": [
                        {"term": "KV Cache", "definition": "Caching previous key and value tensor projections during auto-regressive decoding to avoid O(N^2) recomputation."},
                        {"term": "Grouped-Query Attention (GQA)", "definition": "Sharing key-value heads across multiple query heads to save memory bandwidth during inference."}
                    ],
                    "recommended_readings": ["Vaswani et al. (2017) Attention Is All You Need", "Dao et al. (2022) FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness", "Su et al. (2021) RoFormer: Enhanced Transformer with Rotary Position Embedding"]
                }
            )
        ),
        transcript=[
            TranscriptSegment(id=1, start_time=0.0, end_time=25.0, start_str="00:00", speaker="Prof. Manning", text="Welcome everyone to Lecture 8. Today we are going to explore why attention mechanisms revolutionized modern natural language processing and how modern hardware optimizations make them scalable."),
            TranscriptSegment(id=2, start_time=25.5, end_time=60.0, start_str="00:25", speaker="Prof. Manning", text="Let's write down the standard scaled dot-product attention equation: Softmax of Q times K transpose over square root of d_k, multiplied by V. Why do we divide by square root of d_k? Because for large dimensions, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients."),
            TranscriptSegment(id=3, start_time=60.5, end_time=100.0, start_str="01:00", speaker="Prof. Manning", text="Now during auto-regressive generation, computing this for every newly generated token would require O(N^2) redundant multiplications. That is why we maintain a Key-Value cache in GPU memory."),
            TranscriptSegment(id=4, start_time=100.5, end_time=145.0, start_str="01:40", speaker="Student (David)", text="Professor, when context windows grow to 32k or 128k tokens, the KV cache dominates memory consumption. How do models like LLaMA-3 mitigate this?"),
            TranscriptSegment(id=5, start_time=145.5, end_time=190.0, start_str="02:25", speaker="Prof. Manning", text="Excellent question David. LLaMA-3 uses Grouped-Query Attention (GQA). Instead of having 32 separate key and value heads for 32 query heads, it groups 4 query heads to share 1 key-value head. This cuts the memory footprint by 8 times with virtually zero quality degradation.")
        ]
    )

    save_meeting(sample_1)
    save_meeting(sample_2)
    save_meeting(sample_3)

