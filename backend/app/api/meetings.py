from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from app.models.schemas import Meeting, MeetingStatus, PersonaType
from app.services.storage import (
    list_meetings, get_meeting, delete_meeting,
    toggle_action_item, update_action_item
)

router = APIRouter(prefix="/meetings", tags=["meetings"])

@router.get("", response_model=List[Meeting])
def get_meetings_endpoint(
    search: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    persona: Optional[str] = Query(None)
):
    return list_meetings(search=search, language=language, status=status, persona=persona)

@router.get("/{meeting_id}", response_model=Meeting)
def get_meeting_endpoint(meeting_id: str):
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.delete("/{meeting_id}")
def delete_meeting_endpoint(meeting_id: str):
    success = delete_meeting(meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"status": "success", "message": f"Meeting {meeting_id} deleted"}

@router.post("/{meeting_id}/actions/{action_id}/toggle", response_model=Meeting)
def toggle_action_endpoint(meeting_id: str, action_id: str, completed: Optional[bool] = Body(None)):
    meeting = toggle_action_item(meeting_id, action_id, completed)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting or Action item not found")
    return meeting

@router.patch("/{meeting_id}/actions/{action_id}", response_model=Meeting)
def update_action_endpoint(meeting_id: str, action_id: str, data: Dict[str, Any] = Body(...)):
    meeting = update_action_item(meeting_id, action_id, data)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting or Action item not found")
    return meeting

