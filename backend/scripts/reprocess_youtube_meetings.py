import sys
from pathlib import Path

# Add parent directory to sys.path so app modules can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.schemas import SourceType, MeetingStatus, PersonaType
from app.services.storage import list_meetings, save_meeting, get_meeting
from app.services.ingestion import extract_youtube_transcript
from app.services.nlp import analyze_meeting_nlp
from app.services.vectorstore import index_meeting_transcript

def reprocess_youtube_meetings():
    meetings = list_meetings()
    print(f"[Reprocess] Found {len(meetings)} meetings in database.")

    for m in meetings:
        if m.source_type != SourceType.YOUTUBE or not m.source_url:
            continue

        print(f"\n==========================================")
        print(f"Processing YouTube Meeting: {m.id} - '{m.title}'")
        print(f"URL: {m.source_url}")
        print(f"Existing Transcript Segments: {len(m.transcript)}")

        # 1. Extract genuine subtitles
        segments = extract_youtube_transcript(m.source_url, preferred_lang=m.language or "en")
        if not segments or len(segments) == 0:
            print(f"[-] Subtitle extraction returned no segments. Keeping existing transcript.")
            # Still re-analyze with rich fallback if needed
            segments = m.transcript
        else:
            print(f"[+] Successfully extracted {len(segments)} genuine YouTube subtitle segments!")
            m.transcript = segments

        # 2. Run NLP analysis with Mistral AI / Rich Schema
        print(f"[*] Running NLP summarization and multi-persona extraction...")
        # If the meeting is an OS lecture or general lecture, ensure persona is set appropriately
        summary = analyze_meeting_nlp(
            transcript=segments,
            persona=m.persona or PersonaType.ACADEMIC,
            meeting_title=m.title
        )
        m.summary = summary
        m.status = MeetingStatus.READY
        m.progress_pct = 100
        m.stage_message = "Intelligence Ready & Grounded RAG Online"

        # 3. Save to database
        save_meeting(m)
        print(f"[+] Saved updated meeting {m.id} to SQLite DB.")

        # 4. Re-index in ChromaDB
        try:
            index_meeting_transcript(m.id, segments)
            print(f"[+] Re-indexed {len(segments)} chunks in ChromaDB vectorstore.")
        except Exception as vec_err:
            print(f"[-] Note on vector indexing: {vec_err}")

        print(f"[+] Summary preview: {summary.executive_summary[:120]}...")
        if summary.persona_insights and summary.persona_insights.academic_notes:
            print(f"[+] Academic notes subject: {summary.persona_insights.academic_notes.get('subject')}")

    print("\n[Reprocess] All YouTube meetings successfully processed!")

if __name__ == "__main__":
    reprocess_youtube_meetings()
