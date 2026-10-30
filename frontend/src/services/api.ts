import type {
  Meeting,
  ChatMessage,
  Citation,
  SystemStatus,
  PersonaType
} from '../types';
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || 
  (isLocalhost ? 'http://localhost:8000' : 'https://echo-notes-s96t.onrender.com')
).replace(/\/+$/, '');

export const API_BASE = `${BACKEND_URL}/api`;

export const api = {
  // Connectivity & Health
  async checkHealth(): Promise<{ status: string; app?: string; version?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
      return res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  },
  // Meetings
  async getMeetings(params?: { search?: string; language?: string; status?: string; persona?: string }): Promise<Meeting[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.language) query.append('language', params.language);
    if (params?.status) query.append('status', params.status);
    if (params?.persona) query.append('persona', params.persona);
    
    const res = await fetch(`${API_BASE}/meetings?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch meetings');
    return res.json();
  },

  async getMeeting(id: string): Promise<Meeting> {
    const res = await fetch(`${API_BASE}/meetings/${id}`);
    if (!res.ok) throw new Error('Failed to fetch meeting');
    return res.json();
  },

  async deleteMeeting(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/meetings/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  async toggleActionItem(meetingId: string, actionId: string, completed?: boolean): Promise<Meeting> {
    const res = await fetch(`${API_BASE}/meetings/${meetingId}/actions/${actionId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completed)
    });
    if (!res.ok) throw new Error('Failed to toggle action item');
    return res.json();
  },

  // Ingestion
  async ingestYouTube(data: {
    youtube_url: string;
    title?: string;
    language?: string;
    persona?: PersonaType;
    tags?: string[];
  }): Promise<Meeting> {
    const res = await fetch(`${API_BASE}/ingest/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: 'youtube',
        ...data
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to ingest YouTube video' }));
      throw new Error(err.detail || 'Failed to ingest YouTube video');
    }
    return res.json();
  },

  async uploadMedia(formData: FormData): Promise<Meeting> {
    const res = await fetch(`${API_BASE}/ingest/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload media file' }));
      throw new Error(err.detail || 'Failed to upload media file');
    }
    return res.json();
  },

  // RAG Chat
  async sendChatMessage(payload: {
    message: string;
    meeting_id?: string;
    persona?: PersonaType;
  }): Promise<{ message: string; citations: Citation[]; meeting_id?: string }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  async getChatHistory(meetingId?: string): Promise<ChatMessage[]> {
    const query = meetingId ? `?meeting_id=${meetingId}` : '';
    const res = await fetch(`${API_BASE}/chat/history${query}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async getChatSuggestions(persona: PersonaType = 'general'): Promise<string[]> {
    const res = await fetch(`${API_BASE}/chat/suggestions?persona=${persona}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Settings
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  async getKeys(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings/keys`);
    if (!res.ok) throw new Error('Failed to fetch keys');
    return res.json();
  },

  async updateKeys(keys: {
    openai_api_key?: string;
    sarvam_api_key?: string;
    mistral_api_key?: string;
    huggingface_api_key?: string;
  }): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/settings/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keys)
    });
    return res.json();
  },

  async testProvider(provider: string, key?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/settings/test/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP error ${res.status}` }));
      return { success: false, message: err.detail || err.message || `HTTP ${res.status}` };
    }
    return res.json();
  },

  // Export URLs
  getExportUrl(meetingId: string, format: 'pdf' | 'docx' | 'csv'): string {
    return `${API_BASE}/export/${meetingId}/${format}`;
  }
};

