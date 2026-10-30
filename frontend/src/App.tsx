import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { MeetingDetailView } from './components/MeetingDetailView';
import { SearchGlobalView } from './components/SearchGlobalView';
import { SettingsModal } from './components/SettingsModal';
import type { Meeting, PersonaType, SystemStatus } from './types';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'upload' | 'search' | 'settings'>('dashboard');
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('general');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | undefined>(undefined);
  const [darkMode, setDarkMode] = useState(true);

  // Apply dark class to html document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const list = await api.getMeetings();
      setMeetings(list);
      setBackendOnline(true);
    } catch (err) {
      console.warn('Backend not responding yet (may be cold starting):', err);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const s = await api.getSystemStatus();
      setSystemStatus(s);
      setBackendOnline(true);
    } catch (err) {
      console.warn('Status check pending:', err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchStatus();

    // Auto-poll if any meeting is currently processing or backend waking up
    const interval = setInterval(() => {
      api.getMeetings().then((list) => {
        setMeetings(list);
        setBackendOnline(true);
        if (selectedMeeting) {
          const updated = list.find((m) => m.id === selectedMeeting.id);
          if (updated) setSelectedMeeting(updated);
        }
      }).catch(() => {
        // Still connecting
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleMeetingCreated = (newMeeting: Meeting) => {
    fetchMeetings();
    setSelectedMeeting(newMeeting);
  };

  const handleMeetingUpdated = (updated: Meeting) => {
    setSelectedMeeting(updated);
    setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => {
          setSelectedMeeting(null);
          setCurrentView(view);
        }}
        selectedPersona={selectedPersona}
        onSelectPersona={(persona) => setSelectedPersona(persona)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          currentView={currentView}
          selectedPersona={selectedPersona}
          status={systemStatus}
          backendOnline={backendOnline}
          onNewMeeting={() => {
            setSelectedMeeting(null);
            setCurrentView('upload');
          }}
        />

        {/* Backend Cloud Wake-up / Cold Start Notification */}
        {backendOnline === false && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="font-semibold">
                Cloud backend instance is waking up from sleep. This typically takes 30–45s on free-tier hosting — reconnecting automatically...
              </span>
            </div>
            <button
              onClick={() => {
                fetchMeetings();
                fetchStatus();
              }}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-bold border border-amber-500/40 transition-colors cursor-pointer"
            >
              Retry Now
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {selectedMeeting ? (
            <MeetingDetailView
              meeting={selectedMeeting}
              selectedPersona={selectedPersona}
              onSelectPersona={(persona) => setSelectedPersona(persona)}
              onBack={() => {
                setSelectedMeeting(null);
                fetchMeetings();
              }}
              onMeetingUpdated={handleMeetingUpdated}
            />
          ) : currentView === 'dashboard' ? (
            <DashboardView
              meetings={meetings}
              loading={loading}
              onRefresh={fetchMeetings}
              onSelectMeeting={handleSelectMeeting}
              onNewMeeting={() => setCurrentView('upload')}
            />
          ) : currentView === 'upload' ? (
            <UploadView
              selectedPersona={selectedPersona}
              onMeetingCreated={handleMeetingCreated}
            />
          ) : currentView === 'search' ? (
            <SearchGlobalView
              selectedPersona={selectedPersona}
            />
          ) : currentView === 'settings' ? (
            <SettingsModal
              status={systemStatus}
              onRefreshStatus={fetchStatus}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
