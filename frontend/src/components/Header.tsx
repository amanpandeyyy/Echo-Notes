import React from 'react';
import { Sparkles, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { PersonaType, SystemStatus } from '../types';

interface HeaderProps {
  currentView: 'dashboard' | 'upload' | 'search' | 'settings';
  selectedPersona: PersonaType;
  status: SystemStatus | null;
  backendOnline?: boolean;
  onNewMeeting: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  selectedPersona,
  status,
  backendOnline,
  onNewMeeting
}) => {
  const getPersonaBadge = () => {
    switch (selectedPersona) {
      case 'recruiter':
        return { label: 'Recruiter Synthesis Mode', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-700/60 shadow-sm' };
      case 'project_manager':
        return { label: 'PM Sprint & Blocker Mode', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 shadow-sm' };
      case 'academic':
        return { label: 'Academic & Lecture Mode', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 shadow-sm' };
      default:
        return { label: 'General Intelligence Lens', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-700/60 shadow-sm' };
    }
  };

  const badge = getPersonaBadge();

  return (
    <header className="h-18 px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white capitalize tracking-tight">
            {currentView === 'dashboard' && 'Meeting Intelligence Dashboard'}
            {currentView === 'upload' && 'Process Audio, Video & YouTube'}
            {currentView === 'search' && 'Cross-Meeting Vector Knowledge'}
            {currentView === 'settings' && 'System Credentials & Health'}
          </h1>
        </div>

        <div className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-2 ${badge.color}`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {backendOnline !== undefined && (
          <div className="hidden lg:flex items-center">
            {backendOnline ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Backend Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting to Backend...
              </span>
            )}
          </div>
        )}

        {status && (
          <div className="hidden md:flex items-center gap-3 px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs">
            {status.ffmpeg_installed ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" /> FFmpeg Engine Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <AlertCircle className="w-4 h-4" /> Audio Passthrough
              </span>
            )}
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold">ChromaDB Vector Store</span>
          </div>
        )}

        {currentView !== 'upload' && (
          <button
            onClick={onNewMeeting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:from-sky-700 active:to-blue-700 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Process New Meeting</span>
          </button>
        )}
      </div>
    </header>
  );
};
