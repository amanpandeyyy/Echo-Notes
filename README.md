# Echo-Notes 🎙️⚡
### Full-Stack AI-Powered Meeting Intelligence Assistant & RAG Platform

Echo-Notes is an enterprise-grade meeting intelligence workstation that ingests YouTube lectures, team syncs, and uploaded audio/video files, transcribes them with Whisper & Sarvam AI, extracts concise bullet summaries, decisions, action items, and open questions via Mistral AI & LangChain, stores vector embeddings in ChromaDB, and delivers an interactive transcript player, grounded RAG Q&A with timestamp citations, and PDF/DOCX/CSV reports.

--

## 🌟 Key Features

1. **Multi-Source Ingestion & Preprocessing**:
   - **YouTube URL Fetching**: Downloads high-quality audio streams using `yt-dlp`.
   - **Direct File Upload**: Supports `.mp4`, `.mp3`, `.wav`, `.m4a`, `.webm`, `.mov`, `.flac` with drag-and-drop and format validation.
   - **FFmpeg Normalization**: Converts and resamples audio streams to 16kHz mono PCM for optimal transcription accuracy.

2. **Dual-Engine Speech-to-Text Transcription**:
   - **OpenAI Whisper**: High-accuracy transcription for English and multilingual recordings with segment timestamps.
   - **Sarvam AI (`saaras`)**: Specialized high-accuracy speech-to-text for Hindi, Hinglish, and Indian English.
   - **Live 6-Stage Progress Visualizer**: Step-by-step pipeline tracking in real time (Ingesting → Normalizing → Transcribing → Analyzing → Indexing → Ready).

3. **Structured NLP & Summarization**:
   - **Mistral AI + LangChain Orchestration**: Extracts structured intelligence into distinct labeled sections:
     - 📌 **Executive Summary**: 2-3 sentence synopsis with core takeaways.
     - ⚖️ **Decisions Log**: Explicit decisions made with context, rationale, and owner.
     - 📋 **Interactive Action Items**: Tasks with assignees (`@owner`), priority pills (`HIGH`/`MEDIUM`/`LOW`), due dates, and interactive checkable completion state.
     - ❓ **Open Questions**: Unresolved topics and follow-up flags.
   - **Persona-Specific Synthesis**:
     - 🎯 **Recruiter Mode**: Candidate fit scorecard, technical competence, and hiring recommendations.
     - 💼 **Project Manager Mode**: Sprint velocity impact, blockers, and deliverable tracking.
     - 🎓 **Academic / Research Mode**: Core mathematical theories, definitions, and reading list.

4. **Knowledge Retrieval & Grounded RAG Chat**:
   - **ChromaDB Vector Database**: Stores timestamped transcript segments with cosine similarity indexing.
   - **Hugging Face Embeddings**: High-performance semantic representations using `all-MiniLM-L6-v2`.
   - **Grounded Conversational Co-pilot**: Multi-turn Q&A strictly grounded in the transcript with clickable `[MM:SS]` citation pills that jump the audio and transcript to that exact timestamp.
   - **Global Cross-Meeting Search**: Query across all meetings and recordings in the platform.

5. **Multi-Format Export Hub**:
   - 📄 **PDF Executive Report**: Formatted document generated via ReportLab with corporate branding, metadata, styled tables for decisions & action items, and full transcript.
   - 📝 **Word Document (.docx)**: Styled typography and formatted tables via `python-docx`.
   - 📊 **Structured CSV**: Spreadsheet export with tasks, assignees, priorities, and timestamped lines.

6. **Modern SPA Dashboard**:
   - React 19 + TypeScript + Tailwind CSS with a calm blue/slate aesthetic.
   - Dark Mode / Light Mode with instant toggle.
   - Audio playback bar synchronized with clickable transcript timestamps.
   - In-app Settings & API Key manager with live connection testing.

---

## 🏗️ 6-Stage Pipeline Architecture

```
Stage 1: User Ingestion
   ├── YouTube URL (yt-dlp stream extraction)
   └── Direct Media Upload (.mp4, .mp3, .wav, .m4a, .webm)
          │
Stage 2: Ingestion & Preprocessing
   ├── File validation & metadata extraction
   └── FFmpeg audio normalization (16kHz mono WAV / volume leveling)
          │
Stage 3: Transcription Engine
   ├── OpenAI Whisper API (English / Multilingual with timestamps)
   └── Sarvam AI Saaras API (Hindi & Hinglish speech-to-text)
          │
Stage 4: NLP & Structured Extraction
   ├── Mistral AI + LangChain prompt orchestration
   ├── Executive Summary & Key Takeaways
   ├── Explicit Decisions Log
   ├── Action Items Matrix (Owner, Priority, Due Date)
   └── Persona Lens (Recruiter Scorecard / PM Sprint / Academic Notes)
          │
Stage 5: Vector Store & Indexing
   ├── SQLite Metadata Storage (Meetings, Actions, Chats)
   └── ChromaDB + Hugging Face Embeddings (Timestamped chunk vectors)
          │
Stage 6: Interface & Grounded RAG
   ├── Interactive Transcript with clickable timestamp seek
   ├── Grounded Multi-Turn Chat with citation references [MM:SS]
   └── Multi-Format Exporters (PDF, DOCX, CSV)
```

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites
- **Python 3.10+** (Tested on Python 3.10 - 3.14)
- **Node.js 18+** and **pnpm** (or npm)
- **FFmpeg** installed and added to PATH (Installed and verified)

### 1. Install Backend Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
pnpm install
```

### 3. Configure API Keys (Optional)
Create `backend/.env` or configure keys directly within the in-app **Settings** UI:
```env
MISTRAL_API_KEY=your_mistral_api_key
OPENAI_API_KEY=your_openai_api_key
SARVAM_API_KEY=your_sarvam_api_key
HUGGINGFACE_API_KEY=your_huggingface_token
```
> *Note: Echo-Notes includes built-in offline demo fallbacks so all features, summaries, transcripts, RAG citations, and exports run immediately even without external cloud keys!*

### 4. Launch the Full Application
Run the root launcher:
```bash
python run_app.py
```
Or start backend and frontend separately:

**Terminal 1 (Backend):**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
pnpm dev
```

Open **http://localhost:5173** in your browser to access the Echo-Notes dashboard.

---

## 🧪 Testing & Verification

Run the verification test suite to check database persistence, ChromaDB vector indexing, RAG retrieval, and PDF/DOCX/CSV exporters:
```bash
python -c "import sys; from pathlib import Path; sys.path.insert(0, 'backend'); from app.services.storage import init_db, list_meetings; init_db(); print('Total meetings:', len(list_meetings()))"
```

To run a production frontend build:
```bash
cd frontend
pnpm build
```

---

## 📁 Project Structure

```
Echo-Notes/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── meetings.py     # Meeting CRUD & action toggles
│   │   │   ├── ingest.py       # 6-stage background processing
│   │   │   ├── chat.py         # Grounded RAG & suggestions
│   │   │   ├── export.py       # PDF, DOCX, CSV downloads
│   │   │   └── settings.py     # API keys & connection tests
│   │   ├── models/
│   │   │   └── schemas.py      # Pydantic data schemas
│   │   ├── services/
│   │   │   ├── storage.py      # SQLite persistence & sample seed
│   │   │   ├── ingestion.py    # yt-dlp & FFmpeg normalization
│   │   │   ├── transcription.py# Whisper & Sarvam transcription
│   │   │   ├── nlp.py          # Mistral AI & structured summarization
│   │   │   ├── vectorstore.py  # ChromaDB & Hugging Face embeddings
│   │   │   ├── rag.py          # Grounded QA & citations
│   │   │   └── exporter.py     # ReportLab PDF & python-docx
│   │   └── config.py           # App paths and environment
│   ├── data/                   # SQLite database
│   ├── uploads/                # Normalized audio storage
│   ├── exports/                # Generated PDFs, DOCXs, CSVs
│   ├── chroma_db/              # ChromaDB vector collections
│   ├── requirements.txt
│   └── main.py                 # FastAPI application
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx     # Navigation & persona switch
│   │   │   ├── Header.tsx      # Top bar & system health badge
│   │   │   ├── DashboardView.tsx # KPI metrics, search, filter, cards
│   │   │   ├── UploadView.tsx  # Ingestion wizard & stage visualizer
│   │   │   ├── MeetingDetailView.tsx # Workstation, transcript & chat
│   │   │   ├── SearchGlobalView.tsx  # Cross-meeting RAG search
│   │   │   └── SettingsModal.tsx     # Provider keys & test suite
│   │   ├── services/
│   │   │   └── api.ts          # API REST client
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript schemas
│   │   ├── App.tsx             # Root application & router
│   │   └── index.css           # Tailwind CSS & theme tokens
│   ├── package.json
│   └── vite.config.ts
├── run_app.py                  # Single-command launcher
└── README.md
```

---

## 👥 User Personas & Use Cases

- **Recruiters & Talent Acquisition**: Accelerate candidate debriefs with automated interview scorecards, technical evaluations, and salary expectation tracking.
- **Project Managers & Scrum Leads**: Automatically log approved architecture decisions, unblock delivery bottlenecks, and assign high-priority action items.
- **Engineering Teams**: Search across sprint planning recordings and architectural review sessions with grounded citations.
- **Academic & Research Institutions**: Index lectures and seminar presentations, search equations and core concepts, and jump directly to discussion timestamps.

---

## 📄 License
MIT License. Built for production-quality meeting intelligence and retrieval.

