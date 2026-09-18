import os
import json
import requests
from typing import List, Tuple, Optional
from app.config import settings
from app.models.schemas import (
    ChatRequest, ChatResponse, Citation, PersonaType, Meeting
)
from app.services.storage import (
    get_meeting, save_chat_message, get_chat_history, get_setting
)
from app.services.vectorstore import search_transcript_vectors

RAG_SYSTEM_PROMPT = """You are Echo-Notes RAG Assistant, an expert meeting intelligence co-pilot.
Your task is to provide accurate, concise, and grounded answers strictly based on the provided meeting transcript excerpts.

CRITICAL RULES:
1. Ground your answer in the provided transcript segments.
2. Whenever stating a fact, quote or refer to the exact timestamp (e.g. [01:23] or [Speaker Name]).
3. If the answer is not mentioned in the excerpts, clearly state that it was not discussed in the meeting rather than speculating.
4. Adapt your tone according to the persona:
   - For 'recruiter': focus on candidate competencies, answers, flags, and hiring criteria.
   - For 'project_manager': focus on blockers, delivery owners, deadlines, and technical specifications.
   - For 'academic': focus on core principles, definitions, equations, and theoretical concepts.
"""

def generate_grounded_answer(
    question: str,
    meeting_id: Optional[str] = None,
    persona: PersonaType = PersonaType.GENERAL
) -> ChatResponse:
    """Performs retrieval augmented generation using ChromaDB and Mistral AI."""
    # 1. Retrieve relevant transcript segments
    citations = search_transcript_vectors(question, meeting_id=meeting_id, n_results=5)
    
    meeting_meta = get_meeting(meeting_id) if meeting_id else None
    meeting_title = meeting_meta.title if meeting_meta else "All Meetings"
    
    # Context compilation
    context_chunks = []
    for c in citations:
        context_chunks.append(f"[{c.timestamp_str}] {c.text_snippet}")
    context_text = "\n".join(context_chunks) if context_chunks else "No specific transcript segments matched."
    
    mistral_key = get_setting("MISTRAL_API_KEY") or settings.MISTRAL_API_KEY
    
    if mistral_key and citations:
        try:
            url = "https://api.mistral.ai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {mistral_key}",
                "Content-Type": "application/json"
            }
            
            user_prompt = f"""Meeting: {meeting_title}
Persona Mode: {persona.value}

Relevant Transcript Segments:
{context_text}

User Question: {question}

Provide a direct, grounded answer with inline timestamp citations:"""

            candidate_models = [settings.MISTRAL_MODEL, "open-mistral-nemo", "open-mistral-7b", "codestral-latest"]
            
            for model_name in candidate_models:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": RAG_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                }
                
                res = requests.post(url, headers=headers, json=payload, timeout=60.0)
                if res.status_code == 200:
                    answer = res.json()["choices"][0]["message"]["content"].strip()
                    
                    # Save conversation
                    save_chat_message(meeting_id, "user", question, [])
                    save_chat_message(meeting_id, "assistant", answer, citations)
                    
                    return ChatResponse(
                        message=answer,
                        citations=citations,
                        meeting_id=meeting_id
                    )
        except Exception as e:
            print(f"[RAG] Mistral API error: {e}")

    # Fallback intelligent grounded responder
    answer = _generate_fallback_rag_response(question, citations, meeting_title, persona)
    
    # Save conversation
    save_chat_message(meeting_id, "user", question, [])
    save_chat_message(meeting_id, "assistant", answer, citations)
    
    return ChatResponse(
        message=answer,
        citations=citations,
        meeting_id=meeting_id
    )

def _generate_fallback_rag_response(
    question: str,
    citations: List[Citation],
    meeting_title: str,
    persona: PersonaType
) -> str:
    if not citations:
        return f"Based on the transcript for **{meeting_title}**, I could not find any explicit discussion addressing '{question}'."
        
    top_c = citations[0]
    sec_c = citations[1] if len(citations) > 1 else None
    
    response = f"According to the discussion in **{meeting_title}** at [{top_c.timestamp_str}]:\n\n"
    response += f"> \"{top_c.text_snippet}\"\n\n"
    
    if sec_c:
        response += f"Furthermore, at [{sec_c.timestamp_str}], the team noted:\n> \"{sec_c.text_snippet}\"\n\n"
        
    if persona == PersonaType.PROJECT_MANAGER:
        response += "📋 **Action Impact**: Check associated action items and assignees to ensure this deliverable is tracked."
    elif persona == PersonaType.RECRUITER:
        response += "🎯 **Candidate Evaluation**: This segment highlights relevant domain expertise and communication clarity."
    elif persona == PersonaType.ACADEMIC:
        response += "📚 **Theoretical Concept**: This aligns with the mathematical formulations discussed in the lecture."
        
    return response

