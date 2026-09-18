import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.services.storage import get_meeting
from app.services.exporter import (
    generate_pdf_report, generate_docx_report, generate_csv_report
)

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/{meeting_id}/pdf")
def export_pdf_endpoint(meeting_id: str):
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    pdf_path = generate_pdf_report(meeting)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"EchoNotes_{meeting.title[:30].replace(' ', '_')}.pdf"
    )

@router.get("/{meeting_id}/docx")
def export_docx_endpoint(meeting_id: str):
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    docx_path = generate_docx_report(meeting)
    return FileResponse(
        path=docx_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"EchoNotes_{meeting.title[:30].replace(' ', '_')}.docx"
    )

@router.get("/{meeting_id}/csv")
def export_csv_endpoint(meeting_id: str):
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    csv_path = generate_csv_report(meeting)
    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename=f"EchoNotes_{meeting.title[:30].replace(' ', '_')}.csv"
    )

