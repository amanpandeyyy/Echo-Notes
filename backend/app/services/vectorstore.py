import os
import math
import hashlib
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings
from app.models.schemas import TranscriptSegment, Citation
from app.services.storage import get_setting

_client = None
_collection = None

def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=str(settings.CHROMA_DIR),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
    return _client

def get_meeting_collection():
    global _collection
    client = get_chroma_client()
    _collection = client.get_or_create_collection(
        name="echo_notes_transcripts",
        metadata={"hnsw:space": "cosine"}
    )
    return _collection

def compute_simple_embedding(text: str, dim: int = 384) -> List[float]:
    """Lightweight deterministic text embedding fallback for instant offline execution."""
    vec = [0.0] * dim
    words = text.lower().split()
    for word in words:
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        for i in range(dim):
            vec[i] += ((h >> (i % 32)) & 1) * 2.0 - 1.0
            
    # Normalize
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]

_st_model = None

def get_text_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates embeddings using Hugging Face SentenceTransformers or fast fallback."""
    global _st_model
    hf_token = get_setting("HUGGINGFACE_API_KEY") or settings.HUGGINGFACE_API_KEY
    
    if _st_model is None and hf_token:
        try:
            from sentence_transformers import SentenceTransformer
            _st_model = SentenceTransformer(settings.EMBEDDING_MODEL, token=hf_token)
        except Exception:
            _st_model = "FAILED"
            
    if _st_model and _st_model != "FAILED":
        try:
            embeddings = _st_model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()
        except Exception:
            pass
            
    # Deterministic high-speed normalized embedding for zero-latency local vector search
    return [compute_simple_embedding(t) for t in texts]

def index_meeting_transcript(meeting_id: str, transcript: List[TranscriptSegment]):
    """Stores transcript segments into ChromaDB with rich temporal metadata."""
    if not transcript:
        return
        
    collection = get_meeting_collection()
    
    # Clean existing chunks for this meeting
    try:
        existing = collection.get(where={"meeting_id": meeting_id})
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception as e:
        print(f"[VectorStore] Clean error: {e}")

    ids = []
    documents = []
    metadatas = []
    
    for seg in transcript:
        chunk_id = f"{meeting_id}_seg_{seg.id}"
        doc_text = f"[{seg.start_str}] {seg.speaker}: {seg.text}"
        
        ids.append(chunk_id)
        documents.append(doc_text)
        metadatas.append({
            "meeting_id": meeting_id,
            "segment_id": seg.id,
            "start_time": float(seg.start_time),
            "end_time": float(seg.end_time),
            "start_str": seg.start_str,
            "speaker": seg.speaker or "Speaker",
            "text": seg.text
        })
        
    embeddings = get_text_embeddings(documents)
    
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings
    )
    print(f"[VectorStore] Indexed {len(ids)} segments for meeting {meeting_id}")

def search_transcript_vectors(
    query: str,
    meeting_id: Optional[str] = None,
    n_results: int = 5
) -> List[Citation]:
    """Retrieves relevant transcript snippets matching the query."""
    collection = get_meeting_collection()
    
    query_vec = get_text_embeddings([query])[0]
    where_filter = {"meeting_id": meeting_id} if meeting_id and meeting_id != "global" else None
    
    try:
        results = collection.query(
            query_embeddings=[query_vec],
            n_results=min(n_results, max(1, collection.count())),
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        print(f"[VectorStore] Query error: {e}")
        return []
        
    citations = []
    if results and "metadatas" in results and results["metadatas"]:
        matched_metas = results["metadatas"][0]
        distances = results.get("distances", [[]])[0]
        
        for idx, meta in enumerate(matched_metas):
            score = 1.0 - distances[idx] if idx < len(distances) else 0.85
            citations.append(Citation(
                segment_id=meta.get("segment_id"),
                start_time=float(meta.get("start_time", 0.0)),
                end_time=float(meta.get("end_time", 0.0)),
                timestamp_str=meta.get("start_str", "00:00"),
                text_snippet=meta.get("text", ""),
                score=round(score, 3)
            ))
            
    return citations
