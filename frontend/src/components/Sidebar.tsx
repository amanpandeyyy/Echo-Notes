import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Volume2,
  Users,
  Briefcase,
  GraduationCap,
  Layers,
  Sun,
  Moon
} from 'lucide-react';
import type { PersonaType } from '../types';

interface SidebarProps {
  currentView: 'dashboard' | 'upload' | 'search' | 'settings';
  onSelectView: (view: 'dashboard' | 'upload' | 'search' | 'settings') => void;
  selectedPersona: PersonaType;
  onSelectPersona: (persona: PersonaType) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  selectedPersona,
  onSelectPersona,
  darkMode,
  onToggleDarkMode
}) => {
  const personas = [
    {
      id: 'general',
      label: 'General Overview',
      tag: 'Exec & Decisions',
      icon: Layers,
      activeColor: 'text-sky-400',
      activeBg: 'bg-sky-500/10 border-sky-500/30 text-white'
    },
    {
      id: 'recruiter',
      label: 'Recruiter Scorecard',
      tag: 'Candidate Eval',
      icon: Users,
      activeColor: 'text-purple-400',
      activeBg: 'bg-purple-500/10 border-purple-500/30 text-white'
    },
    {
      id: 'project_manager',
      label: 'Project Manager',
      tag: 'Sprint & Tasks',
      icon: Briefcase,
      activeColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500/10 border-emerald-500/30 text-white'
    },
    {
      id: 'academic',
      label: 'Academic Notes',
      tag: 'Study & Proofs',
      icon: GraduationCap,
      activeColor: 'text-amber-400',
      activeBg: 'bg-amber-500/10 border-amber-500/30 text-white'
    }
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800/80 select-none shrink-0 h-screen sticky top-0 shadow-xl z-30 justify-between">
      {/* Top Header & Navigation Container */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/25 ring-1 ring-sky-400/30 shrink-0">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-base tracking-tight text-white flex items-center gap-2 leading-none">
                <span>Echo-Notes</span>
                <span className="text-xs uppercase font-extrabold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  AI
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium tracking-wide mt-1">
                Meeting Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Navigation & Lens Sections */}
        <div className="px-3.5 py-4 flex-1 overflow-y-auto space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Main Navigation Menu */}
          <div>
            <div className="px-2 text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
              Workspace
            </div>
            <nav className="space-y-1.5">
              <button
                onClick={() => onSelectView('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-sky-500/15 text-white border border-sky-500/30 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <LayoutDashboard className={`w-5 h-5 shrink-0 ${currentView === 'dashboard' ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">Dashboard Hub</span>
              </button>

              <button
                onClick={() => onSelectView('upload')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'upload'
                    ? 'bg-sky-500/15 text-white border border-sky-500/30 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <PlusCircle className={`w-5 h-5 shrink-0 ${currentView === 'upload' ? 'text-sky-400' : 'text-emerald-400'}`} />
                <span className="truncate">New Ingestion</span>
              </button>

              <button
                onClick={() => onSelectView('search')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'search'
                    ? 'bg-sky-500/15 text-white border border-sky-500/30 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Search className={`w-5 h-5 shrink-0 ${currentView === 'search' ? 'text-sky-400' : 'text-purple-400'}`} />
                <span className="truncate">Global RAG Search</span>
              </button>
            </nav>
          </div>

          {/* Intelligence Lens Section - Compact List */}
          <div>
            <div className="px-2 text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Intelligence Lens</span>
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div className="space-y-1.5">
              {personas.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPersona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPersona(p.id as PersonaType)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? p.activeBg
                        : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-5 h-5 shrink-0 ${isSelected ? p.activeColor : 'text-slate-400'}`} />
                      <span className={`text-sm truncate ${isSelected ? 'font-extrabold text-white' : 'font-semibold'}`}>
                        {p.label}
                      </span>
                    </div>
                    {isSelected ? (
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 shadow-xs animate-pulse" />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium truncate max-w-[80px] text-right">
                        {p.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Compact Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectView('settings')}
            className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'settings'
                ? 'bg-slate-800 text-white ring-1 ring-slate-700'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <Settings className="w-4.5 h-4.5 text-slate-400" />
            <span className="truncate">Settings & Keys</span>
          </button>

          <button
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-sky-300" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
