import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Send,
  Loader2,
  ArrowRight,
  Database
} from 'lucide-react';
import type { Citation, PersonaType } from '../types';
import { api } from '../services/api';

interface SearchGlobalViewProps {
  selectedPersona: PersonaType;
}

export const SearchGlobalView: React.FC<SearchGlobalViewProps> = ({
  selectedPersona
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAnswer(null);
    setCitations([]);

    try {
      const res = await api.sendChatMessage({
        message: query,
        persona: selectedPersona
      });
      setAnswer(res.message);
      setCitations(res.citations);
    } catch (err) {
      console.error('Global search error:', err);
      setAnswer('Failed to retrieve knowledge across meetings.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What were the key architectural decisions made across engineering meetings?',
    'Summarize candidate technical scores and recommendations from interviews.',
    'What are the open blockers and deadlines across our roadmap syncs?',
    'What mathematical equations or theories were covered in CS lectures?'
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          <Database className="w-4 h-4" />
          <span>Cross-Meeting Vector RAG Retrieval</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Search Intelligence Across All Meetings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Query the entire ChromaDB knowledge repository to find facts, decisions, and discussions across all sessions.
        </p>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleGlobalSearch} className="relative">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ask anything across all indexed meetings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* Suggested Chips */}
      {!answer && (
        <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            Try Searching:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                }}
                className="p-3 text-left rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-700/60 hover:border-sky-500/30 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span>{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RAG Synthesized Global Answer */}
      {answer && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-800/95 rounded-2xl border border-sky-500/30 shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Synthesized Cross-Meeting Intelligence</h3>
            </div>
            <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {answer}
            </div>
          </div>

          {/* Citations Snippets */}
          {citations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Retrieved Source Excerpts ({citations.length})
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-sky-600 dark:text-sky-400">Timestamp [{c.timestamp_str}]</span>
                      {c.score && <span>Relevance: {Math.round(c.score * 100)}%</span>}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                      "{c.text_snippet}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

