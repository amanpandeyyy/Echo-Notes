import React, { useState } from 'react';
import {
  Search,
  Video,
  FileAudio,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  ArrowRight,
  ListCheck,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import type { Meeting } from '../types';
import { api } from '../services/api';

interface DashboardViewProps {
  meetings: Meeting[];
  loading: boolean;
  onRefresh: () => void;
  onSelectMeeting: (meeting: Meeting) => void;
  onNewMeeting: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  meetings,
  loading,
  onRefresh,
  onSelectMeeting,
  onNewMeeting
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filtered meetings
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLang =
      selectedLanguage === 'all' || m.language === selectedLanguage || m.detected_language === selectedLanguage;
    const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
    return matchesSearch && matchesLang && matchesStatus;
  });

  // Metrics
  const totalDurationMinutes = meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60;
  const totalDecisions = meetings.reduce((acc, m) => acc + (m.summary?.decisions?.length || 0), 0);
  const totalActions = meetings.reduce((acc, m) => acc + (m.summary?.action_items?.length || 0), 0);
  const pendingActions = meetings.reduce(
    (acc, m) => acc + (m.summary?.action_items?.filter((a) => !a.completed).length || 0),
    0
  );

  const getStatusBadge = (status: string, progressPct: number) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" /> Intelligence Ready
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Processing Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {progressPct}% In Progress
          </span>
        );
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meeting intelligence file?')) {
      await api.deleteMeeting(id);
      onRefresh();
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Indexed</span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">{meetings.length}</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Sessions & Recordings</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Audio Duration</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
            {(totalDurationMinutes / 60).toFixed(1)} <span className="text-lg font-bold text-slate-400">hrs</span>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{Math.round(totalDurationMinutes)} audio minutes processed</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action Deliverables</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ListCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
            {pendingActions} <span className="text-base font-semibold text-slate-400">/ {totalActions}</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-bold">{pendingActions} pending deliverables</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Decisions Logged</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">{totalDecisions}</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Extracted with context</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search meetings by keyword, persona or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          />
        </div>

        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-end">
          {/* Language filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="all">All Languages</option>
            <option value="en">English (Whisper)</option>
            <option value="hi">Hindi (Sarvam)</option>
            <option value="hi-en">Hinglish (Sarvam)</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-900/80 text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-900/80 text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Meeting List / Grid */}
      {filteredMeetings.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No meetings found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? 'No meetings matched your search filter. Try clearing your search.'
                : 'Get started by processing your first YouTube lecture, interview, or uploaded recording.'}
            </p>
          </div>
          <button
            onClick={onNewMeeting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all cursor-pointer"
          >
            Process New Meeting
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMeeting(m)}
              className="group p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 hover:border-sky-500/70 dark:hover:border-sky-500/70 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-2.5">
                    {m.source_type === 'youtube' ? (
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <Video className="w-4.5 h-4.5" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <FileAudio className="w-4.5 h-4.5" />
                      </div>
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {m.source_type}
                    </span>
                  </div>
                  {getStatusBadge(m.status, m.progress_pct)}
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {m.title}
                </h3>

                {/* Progress bar if processing */}
                {m.status !== 'ready' && m.status !== 'failed' && (
                  <div className="my-3.5 space-y-1.5">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${m.progress_pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold truncate">{m.stage_message}</div>
                  </div>
                )}

                {/* Summary snippet if ready */}
                {m.summary && (
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-3">
                    {m.summary.executive_summary}
                  </p>
                )}

                {/* Tags */}
                {m.tags && m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {m.tags.slice(0, 3).map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/40"
                      >
                        #{t}
                      </span>
                    ))}
                    {m.tags.length > 3 && (
                      <span className="text-[11px] text-slate-400 font-bold self-center">+{m.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Meta & Stats */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {m.duration_str}
                  </span>
                  <span className="uppercase text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {m.detected_language || m.language}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={(e) => handleDelete(e, m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4.5 h-4.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">Meeting Title</th>
                <th className="px-5 py-3.5">Source</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Language</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Deliverables</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredMeetings.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onSelectMeeting(m)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-white max-w-sm truncate text-sm">
                    {m.title}
                  </td>
                  <td className="px-5 py-4 capitalize font-semibold">{m.source_type}</td>
                  <td className="px-5 py-4 font-mono">{m.duration_str}</td>
                  <td className="px-5 py-4 uppercase font-bold">{m.detected_language || m.language}</td>
                  <td className="px-5 py-4">{getStatusBadge(m.status, m.progress_pct)}</td>
                  <td className="px-5 py-4">
                    {m.summary?.action_items ? (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {m.summary.action_items.length} action items
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => handleDelete(e, m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
