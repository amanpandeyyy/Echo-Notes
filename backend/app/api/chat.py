from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from app.models.schemas import (
    ChatRequest, ChatResponse, ChatMessage, PersonaType
)
from app.services.storage import get_chat_history
from app.services.rag import generate_grounded_answer

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    persona = payload.persona or PersonaType.GENERAL
    response = generate_grounded_answer(
        question=payload.message,
        meeting_id=payload.meeting_id,
        persona=persona
    )
    return response

@router.get("/history", response_model=List[ChatMessage])
def get_chat_history_endpoint(meeting_id: Optional[str] = Query(None)):
    return get_chat_history(meeting_id=meeting_id)

@router.get("/suggestions")
def get_suggested_prompts(persona: Optional[str] = Query("general")):
    if persona == "recruiter":
        return [
            "What were the candidate's core technical strengths?",
            "Were there any red flags or communication gaps noted?",
            "What was the candidate's stated salary expectation & notice period?",
            "Summarize the interviewer's overall hiring recommendation."
        ]
    elif persona == "project_manager":
        return [
            "What were the critical blockers and dependencies mentioned?",
            "List all high-priority action items and assignees.",
            "What explicit architectural decisions were approved?",
            "What are the target delivery deadlines for next sprint?"
        ]
    elif persona == "academic":
        return [
            "Explain the core mathematical theories discussed in this lecture.",
            "What definitions and key terms were introduced?",
            "Why is the quadratic complexity in attention problematic?",
            "List the recommended papers and reading assignments."
        ]
    else:
        return [
            "Give me a high-level executive summary of this meeting.",
            "What decisions were made during this discussion?",
            "What are the immediate next steps and who owns them?",
            "What unresolved questions were left open?"
        ]

