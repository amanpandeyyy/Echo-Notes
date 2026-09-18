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
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const s = await api.getSystemStatus();
      setSystemStatus(s);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchStatus();

    // Auto-poll if any meeting is currently processing
    const interval = setInterval(() => {
      api.getMeetings().then((list) => {
        setMeetings(list);
        if (selectedMeeting) {
          const updated = list.find((m) => m.id === selectedMeeting.id);
          if (updated) setSelectedMeeting(updated);
        }
      }).catch(() => {});
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
          onNewMeeting={() => {
            setSelectedMeeting(null);
            setCurrentView('upload');
          }}
        />

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
