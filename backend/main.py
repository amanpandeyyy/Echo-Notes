import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.services.storage import init_db, list_meetings
from app.services.vectorstore import index_meeting_transcript
from app.api.meetings import router as meetings_router
from app.api.ingest import router as ingest_router
from app.api.chat import router as chat_router
from app.api.export import router as export_router
from app.api.settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and index preloaded sample meetings in ChromaDB
    print(f"[{settings.APP_NAME}] Initializing database and ChromaDB storage...")
    init_db()
    
    # Auto-index sample meetings into ChromaDB
    try:
        meetings = list_meetings()
        for m in meetings:
            if m.transcript:
                index_meeting_transcript(m.id, m.transcript)
        print(f"[{settings.APP_NAME}] Startup complete. {len(meetings)} meetings ready.")
    except Exception as e:
        print(f"[{settings.APP_NAME}] Vector indexing startup warning: {e}")
        
    yield
    print(f"[{settings.APP_NAME}] Shutting down...")

app = FastAPI(
    title="Echo-Notes AI API",
    description="Enterprise Meeting Intelligence & RAG Platform",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(meetings_router, prefix="/api")
app.include_router(ingest_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

# Static mount for uploaded media & exports
app.mount("/static/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")
app.mount("/static/exports", StaticFiles(directory=str(settings.EXPORTS_DIR)), name="exports")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

