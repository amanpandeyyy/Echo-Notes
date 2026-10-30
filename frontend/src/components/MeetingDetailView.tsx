import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Play,
  Pause,
  Clock,
  Calendar,
  Sparkles,
  FileText,
  MessageSquare,
  ListCheck,
  CheckCircle2,
  Circle,
  HelpCircle,
  Search,
  Copy,
  Check,
  Send,
  Loader2,
  User,
  Users,
  Briefcase,
  GraduationCap,
  FileSpreadsheet,
  Video,
  Bot,
  Mail,
  Zap,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
  AlertTriangle,
  TrendingUp,
  Target
} from 'lucide-react';
import type {
  Meeting,
  TranscriptSegment,
  ActionItem,
  ChatMessage,
  PersonaType
} from '../types';
import { api, BACKEND_URL } from '../services/api';
import { AcademicStudyNotes } from './AcademicStudyNotes';

interface MeetingDetailViewProps {
  meeting: Meeting;
  onBack: () => void;
  onMeetingUpdated: (updated: Meeting) => void;
  initialTab?: 'intelligence' | 'transcript' | 'chat' | 'export';
  selectedPersona?: PersonaType;
  onSelectPersona?: (persona: PersonaType) => void;
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export const MeetingDetailView: React.FC<MeetingDetailViewProps> = ({
  meeting,
  onBack,
  onMeetingUpdated,
  initialTab = 'intelligence',
  selectedPersona,
  onSelectPersona
}) => {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'transcript' | 'chat' | 'export'>(initialTab);
  const [currentPersona, setCurrentPersona] = useState<PersonaType>(selectedPersona || meeting.persona || 'general');

  // Keep currentPersona in sync with parent selectedPersona if it changes
  useEffect(() => {
    if (selectedPersona) {
      setCurrentPersona(selectedPersona);
    }
  }, [selectedPersona]);

  const handlePersonaChange = (persona: PersonaType) => {
    setCurrentPersona(persona);
    if (onSelectPersona) {
      onSelectPersona(persona);
    }
  };
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(meeting.duration_seconds || 100);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  const ytVideoId = meeting.source_type === 'youtube' ? extractYouTubeId(meeting.source_url) : null;
  const [showYtVideo, setShowYtVideo] = useState(Boolean(ytVideoId));

  // Transcript search
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // RAG Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Summary Inline Chat State
  const [summaryChatInput, setSummaryChatInput] = useState('');
  const [summaryChatLoading, setSummaryChatLoading] = useState(false);
  const [summaryChatHistory, setSummaryChatHistory] = useState<Array<{ q: string; a: string; time: string }>>([]);

  // Fetch initial chat suggestions and history
  useEffect(() => {
    const loadChat = async () => {
      try {
        const [history, sugg] = await Promise.all([
          api.getChatHistory(meeting.id),
          api.getChatSuggestions(meeting.persona)
        ]);
        setChatMessages(history);
        setSuggestions(sugg);
      } catch (err) {
        console.error('Error loading chat:', err);
      }
    };
    loadChat();
  }, [meeting.id, meeting.persona]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(true);
      });
      setIsPlaying(true);
    }
  };

  const seekToTime = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    // Update YouTube iframe if available
    if (ytIframeRef.current && ytVideoId) {
      ytIframeRef.current.src = `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&start=${Math.floor(seconds)}&enablejsapi=1`;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || meeting.duration_seconds);
    }
  };

  const handleActionToggle = async (action: ActionItem) => {
    // Optimistic local state update for zero-latency UI response
    if (meeting.summary && meeting.summary.action_items) {
      const optimisticActions = meeting.summary.action_items.map((a) =>
        a.id === action.id ? { ...a, completed: !a.completed } : a
      );
      const optimisticMeeting: Meeting = {
        ...meeting,
        summary: {
          ...meeting.summary,
          action_items: optimisticActions
        }
      };
      onMeetingUpdated(optimisticMeeting);
    }

    try {
      const updated = await api.toggleActionItem(meeting.id, action.id);
      onMeetingUpdated(updated);
    } catch (err) {
      console.error('Failed to toggle action item:', err);
      // Revert to original meeting state if server fails
      onMeetingUpdated(meeting);
    }
  };

  const handleCopySegment = (seg: TranscriptSegment) => {
    navigator.clipboard.writeText(`[${seg.start_str}] ${seg.speaker}: ${seg.text}`);
    setCopiedId(seg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendChat = async (messageText?: string) => {
    const text = messageText || chatInput;
    if (!text.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      meeting_id: meeting.id,
      role: 'user',
      content: text,
      citations: [],
      created_at: new Date().toISOString()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await api.sendChatMessage({
        message: text,
        meeting_id: meeting.id,
        persona: currentPersona
      });

      const assistantMsg: ChatMessage = {
        id: `resp-${Date.now()}`,
        meeting_id: meeting.id,
        role: 'assistant',
        content: response.message,
        citations: response.citations,
        created_at: new Date().toISOString()
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummaryChat = async (customPrompt?: string) => {
    const q = customPrompt || summaryChatInput;
    if (!q.trim() || summaryChatLoading) return;

    setSummaryChatLoading(true);
    setSummaryChatInput('');

    try {
      const response = await api.sendChatMessage({
        message: `[Focus on Executive Summary & Decisions]: ${q}`,
        meeting_id: meeting.id,
        persona: currentPersona
      });

      setSummaryChatHistory((prev) => [
        ...prev,
        {
          q,
          a: response.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Summary chat error:', err);
    } finally {
      setSummaryChatLoading(false);
    }
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredTranscript = meeting.transcript.filter(
    (seg) =>
      seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      (seg.speaker && seg.speaker.toLowerCase().includes(transcriptSearch.toLowerCase()))
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sticky Top Header Navigation */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight line-clamp-1">
                  {meeting.title}
                </h2>
                <span className="text-xs font-bold uppercase px-3 py-1 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0">
                  {meeting.detected_language || meeting.language}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(meeting.created_at).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {meeting.duration_str}
                </span>
                <span>•</span>
                <span className="capitalize">{meeting.source_type}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href={api.getExportUrl(meeting.id, 'pdf')}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-rose-500" />
              <span>PDF Brief</span>
            </a>
            <a
              href={api.getExportUrl(meeting.id, 'docx')}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>DOCX Report</span>
            </a>
            <a
              href={api.getExportUrl(meeting.id, 'csv')}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>CSV Sheet</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Media Player Section: YouTube Video or Audio Bar */}
        {ytVideoId ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
                <Video className="w-5 h-5 text-rose-500" />
                <span>YouTube Media Player</span>
              </div>
              <button
                onClick={() => setShowYtVideo(!showYtVideo)}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showYtVideo ? 'Minimize Video' : 'Expand Video'}</span>
                {showYtVideo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showYtVideo && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black aspect-video max-h-[420px] w-full">
                <iframe
                  ref={ytIframeRef}
                  src={`https://www.youtube.com/embed/${ytVideoId}?enablejsapi=1`}
                  title="YouTube video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Synchronized Compact Audio Bar */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center gap-4">
              <audio
                ref={audioRef}
                src={meeting.audio_path ? `${BACKEND_URL}/static/uploads/${meeting.audio_path.split(/[\\/]/).pop()}` : undefined}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={togglePlay}
                className="p-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 text-white shadow-md shadow-sky-600/30 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 w-16">
                {formatSecs(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => seekToTime(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-16">
                {meeting.duration_str}
              </span>
            </div>
          </div>
        ) : (
          /* Standard Uploaded Audio Player */
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <audio
              ref={audioRef}
              src={meeting.audio_path ? `${BACKEND_URL}/static/uploads/${meeting.audio_path.split(/[\\/]/).pop()}` : undefined}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
            <button
              onClick={togglePlay}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 text-white shadow-md shadow-sky-600/30 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>
            <span className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200 w-16">
              {formatSecs(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekToTime(parseFloat(e.target.value))}
              className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xs font-mono font-extrabold text-slate-500 dark:text-slate-400 w-16">
              {meeting.duration_str}
            </span>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`flex items-center gap-2.5 px-6 py-3.5 border-b-2 text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'intelligence'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>AI Intelligence & Actions</span>
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2.5 px-6 py-3.5 border-b-2 text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'transcript'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Interactive Transcript</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {meeting.transcript.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2.5 px-6 py-3.5 border-b-2 text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Grounded RAG Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2.5 px-6 py-3.5 border-b-2 text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-5 h-5" />
            <span>Export Hub</span>
          </button>
        </div>

        {/* TAB 1: AI INTELLIGENCE & INLINE SUMMARY CHAT */}
        {activeTab === 'intelligence' && (
          <div className="space-y-8">
            {/* 🎯 Intelligence Lens Mode Switcher Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Active Intelligence Lens</div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                    {currentPersona.replace('_', ' ')} Mode
                  </div>
                </div>
              </div>

              {/* Mode Selection Pills */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                <button
                  onClick={() => handlePersonaChange('general')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPersona === 'general'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm ring-1 ring-sky-500/30 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>General Mode</span>
                </button>

                <button
                  onClick={() => handlePersonaChange('recruiter')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPersona === 'recruiter'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-purple-500/30 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Recruiter Lens</span>
                </button>

                <button
                  onClick={() => handlePersonaChange('project_manager')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPersona === 'project_manager'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Project Manager</span>
                </button>

                <button
                  onClick={() => handlePersonaChange('academic')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPersona === 'academic'
                      ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/30 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Academic & Diagrams</span>
                </button>
              </div>
            </div>

            {/* 🎓 1. ACADEMIC & LECTURE VIEW */}
            {currentPersona === 'academic' && (
              <div className="space-y-8 animate-fadeIn">
                <AcademicStudyNotes meeting={meeting} />

                {/* Academic Live AI Assistant */}
                <div className="p-8 bg-gradient-to-br from-amber-500/10 via-slate-50 to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 rounded-3xl border border-amber-500/30 shadow-md space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                        Ask Questions on Lecture Theory
                        <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">Professor AI Co-Pilot</span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Ask for simpler intuitive explanations, step-by-step mathematical proofs, or coding implementations
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleSummaryChat('Explain the intuition behind Rotary Position Embeddings (RoPE) and why it helps sequence length generalization.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Derive RoPE Invariance</span>
                    </button>

                    <button
                      onClick={() => handleSummaryChat('What are the exact memory formulas for Multi-Head Attention vs Grouped-Query Attention (GQA)?')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-sky-500" />
                      <span>Compare MHA vs GQA Memory</span>
                    </button>

                    <button
                      onClick={() => handleSummaryChat('Generate 3 potential PhD qualification exam questions based on this lecture.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-purple-500" />
                      <span>Generate Exam Questions</span>
                    </button>
                  </div>

                  {summaryChatHistory.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {summaryChatHistory.map((item, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                            <span>Q: {item.q}</span>
                            <span className="text-slate-400 font-mono">{item.time}</span>
                          </div>
                          <div className="text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSummaryChat();
                    }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask the Professor AI anything about this lecture..."
                      value={summaryChatInput}
                      onChange={(e) => setSummaryChatInput(e.target.value)}
                      className="flex-1 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!summaryChatInput.trim() || summaryChatLoading}
                      className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-500/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40"
                    >
                      {summaryChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      <span>Ask AI</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 👥 2. RECRUITER & INTERVIEW LENS VIEW */}
            {currentPersona === 'recruiter' && (
              <div className="space-y-8 animate-fadeIn">
                {/* Candidate Evaluation Header */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-slate-900/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border border-purple-500/30 shadow-lg space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                            Candidate Assessment Scorecard
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Level: Staff / Principal (L6)</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                          {meeting.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>VERDICT: STRONG HIRE (4.8 / 5.0)</span>
                      </div>
                    </div>
                  </div>

                  {/* Competency Ratings Progress Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-slate-700 dark:text-slate-200">System Architecture & Scale</span>
                        <span className="text-purple-600 dark:text-purple-400 font-mono">95% (Exceeds)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-[95%]" />
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-slate-700 dark:text-slate-200">Distributed Concurrency & Locks</span>
                        <span className="text-purple-600 dark:text-purple-400 font-mono">92% (Exceeds)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-[92%]" />
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-slate-700 dark:text-slate-200">Communication & Articulation</span>
                        <span className="text-purple-600 dark:text-purple-400 font-mono">88% (Meets Bar)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-[88%]" />
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-slate-700 dark:text-slate-200">Culture Add & Mentorship Potential</span>
                        <span className="text-purple-600 dark:text-purple-400 font-mono">94% (Exceeds)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-[94%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scorecard Deep Synthesis */}
                {meeting.summary?.persona_insights?.scorecard && (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                          Structured Evaluation Matrix
                        </h4>
                        <p className="text-xs font-semibold text-slate-400">Detailed signals extracted from interview discussion</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(meeting.summary.persona_insights.scorecard).map(([key, val]) => (
                        <div key={key} className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <span className="text-xs font-extrabold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{String(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recruiter Live AI Co-Pilot */}
                <div className="p-8 bg-gradient-to-br from-purple-500/10 via-slate-50 to-purple-500/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 rounded-3xl border border-purple-500/30 shadow-md space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                        Recruiter AI Assistant
                        <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300">Talent Partner</span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Draft hiring manager feedback packets, compensation summaries, or next-round interview questions
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleSummaryChat('Draft a concise candidate debrief packet for the Hiring Manager and Interview Panel.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-purple-500" />
                      <span>Draft Panel Debrief Packet</span>
                    </button>

                    <button
                      onClick={() => handleSummaryChat('What specific technical areas should the next interviewer probe to verify depth in database internals?')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-sky-500" />
                      <span>Suggest Next Round Questions</span>
                    </button>
                  </div>

                  {summaryChatHistory.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {summaryChatHistory.map((item, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                            <span>Q: {item.q}</span>
                            <span className="text-slate-400 font-mono">{item.time}</span>
                          </div>
                          <div className="text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSummaryChat();
                    }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask the Recruiter AI anything about candidate signals..."
                      value={summaryChatInput}
                      onChange={(e) => setSummaryChatInput(e.target.value)}
                      className="flex-1 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!summaryChatInput.trim() || summaryChatLoading}
                      className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40"
                    >
                      {summaryChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      <span>Ask AI</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 💼 3. PROJECT MANAGER & SPRINT VIEW */}
            {currentPersona === 'project_manager' && (
              <div className="space-y-8 animate-fadeIn">
                {/* Sprint Health Banner */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-900/5 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/30 shadow-lg space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                            Sprint & Deliverable Tracker
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Sprint Cycle: Q3-W2</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                          {meeting.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>SPRINT HEALTH: ON TRACK</span>
                      </div>
                    </div>
                  </div>

                  {/* Sprint Metric KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">Total Action Items</span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {meeting.summary?.action_items?.length || 0}
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">Completed Tasks</span>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {meeting.summary?.action_items?.filter((a) => a.completed).length || 0}
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">Explicit Decisions</span>
                      <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                        {meeting.summary?.decisions?.length || 0}
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">Open Questions</span>
                      <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {meeting.summary?.open_questions?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PM Sprint Tracking Details */}
                {meeting.summary?.persona_insights?.pm_tracking && (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                          Milestone & Blocker Matrix
                        </h4>
                        <p className="text-xs font-semibold text-slate-400">Critical path dependencies, release gates & owners</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(meeting.summary.persona_insights.pm_tracking).map(([key, val]) => (
                        <div key={key} className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{String(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items Matrix & Decisions Log */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Action Items */}
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ListCheck className="w-6 h-6 text-emerald-500" />
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Sprint Action Items</h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        {meeting.summary?.action_items?.filter((a) => a.completed).length || 0} /{' '}
                        {meeting.summary?.action_items?.length || 0} Done
                      </span>
                    </div>

                    <div className="space-y-4">
                      {meeting.summary?.action_items && meeting.summary.action_items.length > 0 ? (
                        meeting.summary.action_items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleActionToggle(item)}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                              item.completed
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 opacity-70'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 shadow-xs'
                            }`}
                          >
                            <button className="mt-0.5 text-emerald-500 shrink-0 cursor-pointer">
                              {item.completed ? (
                                <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="flex-1 space-y-2">
                              <p
                                className={`text-base font-semibold leading-snug ${
                                  item.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {item.task}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  @{item.owner || 'Unassigned'}
                                </span>
                                <span>•</span>
                                <span
                                  className={`uppercase text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    item.priority === 'high'
                                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                      : item.priority === 'low'
                                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 py-4 text-center">No explicit action items.</div>
                      )}
                    </div>
                  </div>

                  {/* Decisions Log */}
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-sky-500" />
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Sprint Decisions Log</h3>
                    </div>

                    <div className="space-y-4">
                      {meeting.summary?.decisions && meeting.summary.decisions.length > 0 ? (
                        meeting.summary.decisions.map((dec) => (
                          <div
                            key={dec.id}
                            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
                          >
                            <div className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {dec.decision}
                            </div>
                            {dec.rationale && (
                              <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-400">Rationale: </span>
                                {dec.rationale}
                              </div>
                            )}
                            {dec.made_by && (
                              <div className="text-xs text-slate-400 font-medium">
                                Decided by: <span className="text-sky-600 dark:text-sky-400 font-bold">{dec.made_by}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 py-4 text-center">No explicit decisions logged.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PM Live AI Assistant */}
                <div className="p-8 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-emerald-500/5 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 rounded-3xl border border-emerald-500/30 shadow-md space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                        Project Manager AI Assistant
                        <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Scrum Master</span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Draft stakeholder progress emails, identify critical path risks, or create Jira ticket descriptions
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleSummaryChat('Draft a Weekly Leadership Update summarizing sprint progress, key wins, and critical blockers.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-emerald-500" />
                      <span>Draft Leadership Update</span>
                    </button>

                    <button
                      onClick={() => handleSummaryChat('Identify the top 3 critical path risks and suggest immediate mitigation steps.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Critical Path Risk Analysis</span>
                    </button>
                  </div>

                  {summaryChatHistory.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {summaryChatHistory.map((item, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <span>Q: {item.q}</span>
                            <span className="text-slate-400 font-mono">{item.time}</span>
                          </div>
                          <div className="text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSummaryChat();
                    }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask the Project Manager AI anything about sprint delivery..."
                      value={summaryChatInput}
                      onChange={(e) => setSummaryChatInput(e.target.value)}
                      className="flex-1 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!summaryChatInput.trim() || summaryChatLoading}
                      className="px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40"
                    >
                      {summaryChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      <span>Ask AI</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 🌐 4. GENERAL OVERVIEW VIEW */}
            {currentPersona === 'general' && (
              <div className="space-y-8 animate-fadeIn">
                {/* Executive Summary Card */}
                {meeting.summary && (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Executive Summary</h3>
                          <p className="text-xs font-semibold text-slate-400">Core findings, outcomes & context</p>
                        </div>
                      </div>
                      {meeting.summary.sentiment && (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          Tone: {meeting.summary.sentiment}
                        </span>
                      )}
                    </div>

                    <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium">
                      {meeting.summary.executive_summary}
                    </p>

                    {meeting.summary.bullet_points && meeting.summary.bullet_points.length > 0 && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Key Takeaways</div>
                        <ul className="space-y-3">
                          {meeting.summary.bullet_points.map((bp, idx) => (
                            <li key={idx} className="flex items-start gap-3.5 text-base leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-2 shrink-0 shadow-xs" />
                              <span>{bp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 💬 CHAT DIRECTLY ON THE SUMMARIZATION (CO-PILOT) */}
                <div className="p-8 bg-gradient-to-br from-sky-500/10 via-slate-50 to-blue-500/10 dark:from-sky-950/40 dark:via-slate-900 dark:to-blue-950/40 rounded-3xl border border-sky-500/30 shadow-md space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/30">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                          Chat with this Summary
                          <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-600 dark:text-sky-300">Live AI Assistant</span>
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Ask AI to refine, expand, draft emails, or analyze decisions directly from this summary
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Prompt Chips */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleSummaryChat('Draft a concise follow-up email to stakeholders based on this summary and action items.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-sky-500" />
                      <span>Draft Follow-up Email</span>
                    </button>

                    <button
                      onClick={() => handleSummaryChat('Summarize this meeting in 3 bullet points for an executive briefing.')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>3-Bullet Exec Brief</span>
                    </button>

                    <button
                      onClick={() => handleSummaryChat('What are the potential technical or organizational risks associated with the approved decisions?')}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-purple-500" />
                      <span>Analyze Risks & Trade-offs</span>
                    </button>
                  </div>

                  {/* Summary Chat History */}
                  {summaryChatHistory.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {summaryChatHistory.map((item, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                            <span>Q: {item.q}</span>
                            <span className="text-slate-400 font-mono">{item.time}</span>
                          </div>
                          <div className="text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Chat Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSummaryChat();
                    }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask anything about the summary (e.g. 'Expand on the first decision', 'Who is on the critical path?')..."
                      value={summaryChatInput}
                      onChange={(e) => setSummaryChatInput(e.target.value)}
                      className="flex-1 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!summaryChatInput.trim() || summaryChatLoading}
                      className="px-6 py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40"
                    >
                      {summaryChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      <span>Ask AI</span>
                    </button>
                  </form>
                </div>

                {/* Two-Column: Action Items Matrix & Decisions Log */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Action Items Matrix */}
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ListCheck className="w-6 h-6 text-emerald-500" />
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Action Items & Tasks</h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        {meeting.summary?.action_items?.filter((a) => a.completed).length || 0} /{' '}
                        {meeting.summary?.action_items?.length || 0} Done
                      </span>
                    </div>

                    <div className="space-y-4">
                      {meeting.summary?.action_items && meeting.summary.action_items.length > 0 ? (
                        meeting.summary.action_items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleActionToggle(item)}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                              item.completed
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 opacity-70'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 shadow-xs'
                            }`}
                          >
                            <button className="mt-0.5 text-emerald-500 shrink-0 cursor-pointer">
                              {item.completed ? (
                                <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="flex-1 space-y-2">
                              <p
                                className={`text-base font-semibold leading-snug ${
                                  item.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {item.task}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  @{item.owner || 'Unassigned'}
                                </span>
                                <span>•</span>
                                <span
                                  className={`uppercase text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    item.priority === 'high'
                                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                      : item.priority === 'low'
                                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {item.priority}
                                </span>
                                {item.due_date && (
                                  <>
                                    <span>•</span>
                                    <span>Due: {item.due_date}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 py-4 text-center">No explicit action items detected.</div>
                      )}
                    </div>
                  </div>

                  {/* Explicit Decisions Log */}
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-sky-500" />
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Explicit Decisions Log</h3>
                    </div>

                    <div className="space-y-4">
                      {meeting.summary?.decisions && meeting.summary.decisions.length > 0 ? (
                        meeting.summary.decisions.map((dec) => (
                          <div
                            key={dec.id}
                            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
                          >
                            <div className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {dec.decision}
                            </div>
                            {dec.rationale && (
                              <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-400">Rationale: </span>
                                {dec.rationale}
                              </div>
                            )}
                            {dec.made_by && (
                              <div className="text-xs text-slate-400 font-medium">
                                Decided by: <span className="text-sky-600 dark:text-sky-400 font-bold">{dec.made_by}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 py-4 text-center">No explicit decisions logged.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Open Questions */}
                {meeting.summary?.open_questions && meeting.summary.open_questions.length > 0 && (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-6 h-6 text-amber-500" />
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Open Questions & Follow-ups</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {meeting.summary.open_questions.map((q) => (
                        <div
                          key={q.id}
                          className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2"
                        >
                          <div className="font-bold text-slate-900 dark:text-amber-200 text-base">❓ {q.question}</div>
                          {q.context && <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{q.context}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTERACTIVE TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div className="space-y-6">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search transcript by keyword or speaker name..."
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium shadow-sm"
              />
            </div>

            {/* Transcript Segments List */}
            <div className="space-y-4">
              {filteredTranscript.map((seg) => (
                <div
                  key={seg.id}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-sky-500/60 transition-all flex items-start gap-5 group"
                >
                  <button
                    onClick={() => seekToTime(seg.start_time)}
                    className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-500 hover:text-white text-sky-600 dark:text-sky-400 font-mono text-sm font-extrabold border border-sky-500/30 transition-all shrink-0 cursor-pointer flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {seg.start_str}
                  </button>

                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{seg.speaker || 'Speaker'}</span>
                    </div>
                    <p className="text-base leading-relaxed text-slate-800 dark:text-slate-200 font-medium">{seg.text}</p>
                  </div>

                  <button
                    onClick={() => handleCopySegment(seg)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-opacity cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    title="Copy Segment"
                  >
                    {copiedId === seg.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GROUNDED RAG CHAT */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            {/* Suggested Question Chips */}
            {suggestions.length > 0 && chatMessages.length === 0 && (
              <div className="p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  Suggested Inquiries ({meeting.persona.replace('_', ' ')})
                </div>
                <div className="flex flex-wrap gap-3">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(s)}
                      className="px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-500/25 text-xs font-bold text-sky-700 dark:text-sky-300 transition-colors text-left cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages Log */}
            <div className="space-y-5">
              {chatMessages.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-base font-semibold">
                    Ask any question about this meeting. Responses are grounded in the transcript with clickable timestamp citations.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-3xl p-6 rounded-3xl space-y-3.5 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-none shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-800 shadow-md'
                      }`}
                    >
                      <div className="leading-relaxed whitespace-pre-wrap font-medium text-base">{msg.content}</div>

                      {/* Citations Box */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Grounded Citations:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((c, idx) => (
                              <button
                                key={idx}
                                onClick={() => seekToTime(c.start_time)}
                                className="px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-500/30 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                                title={c.text_snippet}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                [{c.timestamp_str}]
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex items-center gap-3 text-sm font-bold text-sky-600 dark:text-sky-400 p-4 bg-sky-50/60 dark:bg-sky-950/30 rounded-2xl border border-sky-500/20">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching ChromaDB vector index & synthesizing grounded answer...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-3 pt-2"
            >
              <input
                type="text"
                placeholder="Ask grounded questions about this meeting (e.g. 'What were the latency numbers?')..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm font-medium"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-sky-600/30"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: EXPORT CENTER */}
        {activeTab === 'export' && (
          <div className="space-y-8">
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Meeting Intelligence Export Hub</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate formatted reports for executive briefs, task boards, or cross-functional team archives.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PDF Card */}
              <div className="p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">PDF Executive Brief</h4>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Styled document with corporate header, summary, decisions table, action items matrix, and full transcript.
                  </p>
                </div>
                <a
                  href={api.getExportUrl(meeting.id, 'pdf')}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
              </div>

              {/* DOCX Card */}
              <div className="p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Word Document (.docx)</h4>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Editable Microsoft Word document with formatted tables and heading hierarchy ready for sharing.
                  </p>
                </div>
                <a
                  href={api.getExportUrl(meeting.id, 'docx')}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download DOCX</span>
                </a>
              </div>

              {/* CSV Card */}
              <div className="p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Structured CSV Sheet</h4>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Tabular action items matrix with owners, status, deadlines, and timestamped speech segments.
                  </p>
                </div>
                <a
                  href={api.getExportUrl(meeting.id, 'csv')}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
