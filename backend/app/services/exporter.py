import os
import io
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from app.config import settings
from app.models.schemas import Meeting

def generate_pdf_report(meeting: Meeting) -> str:
    """Generates a professional PDF report for a meeting using ReportLab."""
    pdf_filename = f"EchoNotes_{meeting.id}_{int(datetime.utcnow().timestamp())}.pdf"
    pdf_path = settings.EXPORTS_DIR / pdf_filename
    
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#0284c7")  # Sky 600
    text_color = colors.HexColor("#334155")    # Slate 700
    bg_light = colors.HexColor("#f8fafc")      # Slate 50
    border_color = colors.HexColor("#e2e8f0")  # Slate 200
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=accent_color,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_color,
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-12,
        spaceAfter=3
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=text_color
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []
    
    # Header Branding
    story.append(Paragraph("ECHO-NOTES • MEETING INTELLIGENCE REPORT", subtitle_style))
    story.append(Paragraph(meeting.title, title_style))
    
    # Metadata bar
    meta_text = f"<b>Date:</b> {meeting.created_at.strftime('%Y-%m-%d %H:%M UTC')} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Duration:</b> {meeting.duration_str} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Language:</b> {meeting.language.upper()} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Persona:</b> {meeting.persona.value.replace('_', ' ').title()}"
    story.append(Paragraph(meta_text, subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    # Summary Section
    if meeting.summary:
        story.append(Paragraph("Executive Summary", h1_style))
        story.append(Paragraph(meeting.summary.executive_summary, body_style))
        story.append(Spacer(1, 6))
        
        if meeting.summary.bullet_points:
            story.append(Paragraph("Key Takeaways", h1_style))
            for bp in meeting.summary.bullet_points:
                story.append(Paragraph(f"• {bp}", bullet_style))
            story.append(Spacer(1, 6))
            
        # Decisions Table
        if meeting.summary.decisions:
            story.append(Paragraph("Decisions Log", h1_style))
            dec_data = [[Paragraph("Decision", table_header_style), Paragraph("Rationale", table_header_style), Paragraph("Made By", table_header_style)]]
            for d in meeting.summary.decisions:
                dec_data.append([
                    Paragraph(d.decision, table_cell_style),
                    Paragraph(d.rationale or "—", table_cell_style),
                    Paragraph(d.made_by or "Team", table_cell_style)
                ])
            
            t_dec = Table(dec_data, colWidths=[200, 220, 120])
            t_dec.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), primary_color),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.5, border_color),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(t_dec)
            story.append(Spacer(1, 8))
            
        # Action Items Table
        if meeting.summary.action_items:
            story.append(Paragraph("Action Items & Deliverables", h1_style))
            act_data = [[
                Paragraph("Status", table_header_style),
                Paragraph("Task", table_header_style),
                Paragraph("Owner", table_header_style),
                Paragraph("Priority", table_header_style),
                Paragraph("Due Date", table_header_style)
            ]]
            for a in meeting.summary.action_items:
                status_str = "✓ Done" if a.completed else "Pending"
                act_data.append([
                    Paragraph(status_str, table_cell_style),
                    Paragraph(a.task, table_cell_style),
                    Paragraph(a.owner or "Unassigned", table_cell_style),
                    Paragraph(a.priority.value.upper(), table_cell_style),
                    Paragraph(a.due_date or "—", table_cell_style)
                ])
                
            t_act = Table(act_data, colWidths=[60, 220, 100, 70, 90])
            t_act.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), accent_color),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.5, border_color),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(t_act)
            story.append(Spacer(1, 8))
            
        # Open Questions
        if meeting.summary.open_questions:
            story.append(Paragraph("Open Questions & Follow-ups", h1_style))
            for q in meeting.summary.open_questions:
                story.append(Paragraph(f"❓ <b>{q.question}</b>", bullet_style))
                if q.context:
                    story.append(Paragraph(f"<i>Context: {q.context}</i>", ParagraphStyle('SubContext', parent=body_style, leftIndent=16, fontSize=8.5, textColor=colors.HexColor("#64748b"))))
            story.append(Spacer(1, 8))

    # Transcript Section
    if meeting.transcript:
        story.append(Paragraph("Full Timestamped Transcript", h1_style))
        for seg in meeting.transcript:
            seg_text = f"<b>[{seg.start_str}] {seg.speaker}:</b> {seg.text}"
            story.append(Paragraph(seg_text, body_style))
            
    doc.build(story)
    return str(pdf_path)

def generate_docx_report(meeting: Meeting) -> str:
    """Generates a styled DOCX report for a meeting using python-docx."""
    docx_filename = f"EchoNotes_{meeting.id}_{int(datetime.utcnow().timestamp())}.docx"
    docx_path = settings.EXPORTS_DIR / docx_filename
    
    doc = Document()
    
    # Title & Metadata
    title_p = doc.add_heading(meeting.title, level=0)
    title_p.runs[0].font.color.rgb = RGBColor(15, 23, 42)
    
    meta_p = doc.add_paragraph()
    meta_p.add_run(f"Generated by Echo-Notes AI • Date: {meeting.created_at.strftime('%Y-%m-%d %H:%M UTC')} • Duration: {meeting.duration_str} • Language: {meeting.language.upper()}\n").italic = True
    
    if meeting.summary:
        # Executive Summary
        doc.add_heading('Executive Summary', level=1)
        doc.add_paragraph(meeting.summary.executive_summary)
        
        # Key Takeaways
        if meeting.summary.bullet_points:
            doc.add_heading('Key Takeaways', level=1)
            for bp in meeting.summary.bullet_points:
                doc.add_paragraph(bp, style='List Bullet')
                
        # Decisions Log
        if meeting.summary.decisions:
            doc.add_heading('Decisions Log', level=1)
            table = doc.add_table(rows=1, cols=3)
            table.style = 'Light Shading Accent 1'
            hdr_cells = table.rows[0].cells
            hdr_cells[0].text = 'Decision'
            hdr_cells[1].text = 'Rationale'
            hdr_cells[2].text = 'Made By'
            for d in meeting.summary.decisions:
                row_cells = table.add_row().cells
                row_cells[0].text = d.decision
                row_cells[1].text = d.rationale or ''
                row_cells[2].text = d.made_by or ''
            doc.add_paragraph()
            
        # Action Items
        if meeting.summary.action_items:
            doc.add_heading('Action Items', level=1)
            table = doc.add_table(rows=1, cols=5)
            table.style = 'Light Shading Accent 1'
            hdr_cells = table.rows[0].cells
            hdr_cells[0].text = 'Status'
            hdr_cells[1].text = 'Task'
            hdr_cells[2].text = 'Owner'
            hdr_cells[3].text = 'Priority'
            hdr_cells[4].text = 'Due Date'
            for a in meeting.summary.action_items:
                row_cells = table.add_row().cells
                row_cells[0].text = 'Done' if a.completed else 'Pending'
                row_cells[1].text = a.task
                row_cells[2].text = a.owner or 'Unassigned'
                row_cells[3].text = a.priority.value.upper()
                row_cells[4].text = a.due_date or ''
            doc.add_paragraph()
            
        # Open Questions
        if meeting.summary.open_questions:
            doc.add_heading('Open Questions', level=1)
            for q in meeting.summary.open_questions:
                p = doc.add_paragraph(style='List Bullet')
                p.add_run(q.question).bold = True
                if q.context:
                    p.add_run(f" (Context: {q.context})").italic = True
                    
    # Transcript
    if meeting.transcript:
        doc.add_heading('Transcript', level=1)
        for seg in meeting.transcript:
            p = doc.add_paragraph()
            p.add_run(f"[{seg.start_str}] {seg.speaker}: ").bold = True
            p.add_run(seg.text)
            
    doc.save(str(docx_path))
    return str(docx_path)

def generate_csv_report(meeting: Meeting) -> str:
    """Generates a CSV export of action items, decisions, and transcript."""
    csv_filename = f"EchoNotes_{meeting.id}_{int(datetime.utcnow().timestamp())}.csv"
    csv_path = settings.EXPORTS_DIR / csv_filename
    
    with open(csv_path, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Section 1: Metadata
        writer.writerow(["MEETING METADATA"])
        writer.writerow(["Title", meeting.title])
        writer.writerow(["Date", meeting.created_at.isoformat()])
        writer.writerow(["Duration", meeting.duration_str])
        writer.writerow(["Language", meeting.language])
        writer.writerow([])
        
        # Section 2: Action Items
        writer.writerow(["ACTION ITEMS"])
        writer.writerow(["Status", "Task", "Owner", "Priority", "Due Date"])
        if meeting.summary and meeting.summary.action_items:
            for a in meeting.summary.action_items:
                writer.writerow(["Done" if a.completed else "Pending", a.task, a.owner, a.priority.value, a.due_date])
        writer.writerow([])
        
        # Section 3: Decisions
        writer.writerow(["DECISIONS LOG"])
        writer.writerow(["Decision", "Rationale", "Made By"])
        if meeting.summary and meeting.summary.decisions:
            for d in meeting.summary.decisions:
                writer.writerow([d.decision, d.rationale, d.made_by])
        writer.writerow([])
        
        # Section 4: Transcript
        writer.writerow(["TRANSCRIPT SEGMENTS"])
        writer.writerow(["Segment ID", "Timestamp", "Speaker", "Text"])
        for seg in meeting.transcript:
            writer.writerow([seg.id, seg.start_str, seg.speaker, seg.text])
            
    return str(csv_path)

