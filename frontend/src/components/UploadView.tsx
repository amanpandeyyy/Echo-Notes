import React, { useState, useRef } from 'react';
import {
  Video,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Tag,
  Languages,
  ArrowRight
} from 'lucide-react';
import type { PersonaType, LanguageOption, Meeting } from '../types';
import { api } from '../services/api';

interface UploadViewProps {
  selectedPersona: PersonaType;
  onMeetingCreated: (meeting: Meeting) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  selectedPersona,
  onMeetingCreated
}) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<LanguageOption>('auto');
  const [persona, setPersona] = useState<PersonaType>(selectedPersona);
  const [tagsInput, setTagsInput] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Processing State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingMeeting, setProcessingMeeting] = useState<Meeting | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pipelineStages = [
    { key: 'ingesting', label: '1. Ingestion', desc: 'Fetching stream or validating media' },
    { key: 'normalizing', label: '2. Normalization', desc: 'FFmpeg 16kHz mono resampling' },
    { key: 'transcribing', label: '3. Transcription', desc: 'Whisper / Sarvam speech-to-text' },
    { key: 'analyzing', label: '4. NLP Extraction', desc: 'Mistral AI summary & action items' },
    { key: 'indexing', label: '5. Vector Indexing', desc: 'Hugging Face embeddings & ChromaDB' },
    { key: 'ready', label: '6. Ready', desc: 'Grounded intelligence ready' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.mov', '.ogg', '.flac'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMsg('Invalid file format. Please select an MP3, MP4, WAV, M4A, or WebM file.');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
  };

  const pollMeetingProgress = async (meetingId: string) => {
    const interval = setInterval(async () => {
      try {
        const m = await api.getMeeting(meetingId);
        setProcessingMeeting(m);
        if (m.status === 'ready') {
          clearInterval(interval);
          setIsSubmitting(false);
          setTimeout(() => {
            onMeetingCreated(m);
          }, 1200);
        } else if (m.status === 'failed') {
          clearInterval(interval);
          setIsSubmitting(false);
          setErrorMsg(m.error_message || 'Processing failed.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      let created: Meeting;
      if (activeTab === 'youtube') {
        if (!youtubeUrl.trim()) {
          throw new Error('Please enter a valid YouTube URL');
        }
        created = await api.ingestYouTube({
          youtube_url: youtubeUrl.trim(),
          title: title.trim() || undefined,
          language,
          persona,
          tags
        });
      } else {
        if (!selectedFile) {
          throw new Error('Please select an audio or video file to upload');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (title.trim()) formData.append('title', title.trim());
        formData.append('language', language);
        formData.append('persona', persona);
        formData.append('tags', tags.join(','));

        created = await api.uploadMedia(formData);
      }

      setProcessingMeeting(created);
      pollMeetingProgress(created.id);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit meeting');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Process New Meeting or Lecture</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Extract speech, generate structured takeaways, action items, and index into ChromaDB for instant Q&A.
        </p>
      </div>

      {/* Active Pipeline Progress Overlay if processing */}
      {processingMeeting && isSubmitting && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/95 border border-sky-500/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{processingMeeting.title}</h3>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium">{processingMeeting.stage_message}</p>
              </div>
            </div>
            <div className="text-xs font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              {processingMeeting.progress_pct}% Completed
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${processingMeeting.progress_pct}%` }}
            />
          </div>

          {/* 6-Stage Visualizer */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pipelineStages.map((stage, idx) => {
              const isDone =
                processingMeeting.status === 'ready' ||
                (idx === 0 && processingMeeting.progress_pct >= 20) ||
                (idx === 1 && processingMeeting.progress_pct >= 40) ||
                (idx === 2 && processingMeeting.progress_pct >= 65) ||
                (idx === 3 && processingMeeting.progress_pct >= 85) ||
                (idx === 4 && processingMeeting.progress_pct >= 95);

              const isCurrent =
                processingMeeting.status !== 'ready' &&
                ((idx === 0 && processingMeeting.progress_pct < 20) ||
                  (idx === 1 && processingMeeting.progress_pct >= 20 && processingMeeting.progress_pct < 40) ||
                  (idx === 2 && processingMeeting.progress_pct >= 40 && processingMeeting.progress_pct < 65) ||
                  (idx === 3 && processingMeeting.progress_pct >= 65 && processingMeeting.progress_pct < 85) ||
                  (idx === 4 && processingMeeting.progress_pct >= 85 && processingMeeting.progress_pct < 98) ||
                  (idx === 5 && processingMeeting.progress_pct >= 98));

              return (
                <div
                  key={stage.key}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isDone
                      ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : isCurrent
                      ? 'bg-sky-500/10 border-sky-500/50 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{stage.label}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin" />
                    ) : null}
                  </div>
                  <div className="text-[11px] mt-1 opacity-80 truncate">{stage.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Input Card */}
      {!isSubmitting && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'youtube'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="w-4 h-4 text-rose-500" />
              <span>YouTube Video / Stream</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-sky-500" />
              <span>Audio / Video Upload</span>
            </button>
          </div>

          {/* Form Fields Card */}
          <div className="p-6 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-5">
            {activeTab === 'youtube' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  YouTube Video Link <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Video className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Supports YouTube lectures, webinars, podcasts, and interview recordings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Upload Media File <span className="text-rose-500">*</span>
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-sky-500 bg-sky-500/5'
                      : selectedFile
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-sky-500/60 bg-slate-50 dark:bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.mp4,.wav,.m4a,.webm,.mov,.ogg,.flac"
                    onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{selectedFile.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for FFmpeg normalization
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Click to browse or drag and drop recording
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Supported: MP4, MP3, WAV, M4A, WebM (up to 500MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Title & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Meeting Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Roadmap Review or Candidate Screen"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tags (Comma-separated)
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Engineering, Sprint, Hiring, CS224N"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Language & Persona Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-sky-500" />
                  Transcription Language Engine
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageOption)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="auto">Auto Detect Language</option>
                  <option value="en">English (OpenAI Whisper)</option>
                  <option value="hi">Hindi (Sarvam AI Saaras)</option>
                  <option value="hi-en">Hinglish / Indian English (Sarvam AI)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  Intelligence Analysis Lens
                </label>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value as PersonaType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="general">Standard (Executive Brief & Action Items)</option>
                  <option value="recruiter">Recruiter (Candidate Fit & Scorecard)</option>
                  <option value="project_manager">Project Manager (Sprint Tracker & Blockers)</option>
                  <option value="academic">Academic (Lecture Notes & Theories)</option>
                </select>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Ingestion & Analysis Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

