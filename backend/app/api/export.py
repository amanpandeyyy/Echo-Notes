import os
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.services.storage import get_meeting
from app.services.exporter import (
    generate_pdf_report, generate_docx_report, generate_csv_report
)

router = APIRouter(prefix="/export", tags=["export"])

def sanitize_filename(title: str, ext: str) -> str:
    """Produces clean ASCII safe filename for HTTP Content-Disposition headers."""
    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title[:30].strip())
    clean_title = re.sub(r'_+', '_', clean_title).strip('_') or "Report"
    return f"EchoNotes_{clean_title}.{ext}"

@router.get("/{meeting_id}/pdf")
def export_pdf_endpoint(meeting_id: str):
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    pdf_path = generate_pdf_report(meeting)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=sanitize_filename(meeting.title, "pdf")
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
        filename=sanitize_filename(meeting.title, "docx")
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
        filename=sanitize_filename(meeting.title, "csv")
    )

