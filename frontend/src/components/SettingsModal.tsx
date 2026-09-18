import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RefreshCw,
  Cpu,
  Sparkles
} from 'lucide-react';
import type { SystemStatus } from '../types';
import { api } from '../services/api';

interface SettingsModalProps {
  status: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  status,
  onRefreshStatus
}) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [sarvamKey, setSarvamKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [hfKey, setHfKey] = useState('');

  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const keys = await api.getKeys();
      setMaskedKeys(keys);
    } catch (err) {
      console.error('Failed to load keys:', err);
    }
  };

  const handleTestProvider = async (provider: string, keyVal?: string) => {
    setTestResults((prev) => ({
      ...prev,
      [provider]: { loading: true }
    }));

    try {
      const res = await api.testProvider(provider, keyVal || undefined);
      setTestResults((prev) => ({
        ...prev,
        [provider]: { loading: false, success: res.success, message: res.message }
      }));
      onRefreshStatus();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { loading: false, success: false, message: err.message || 'Test failed' }
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload: any = {};
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
      if (sarvamKey.trim()) payload.sarvam_api_key = sarvamKey.trim();
      if (mistralKey.trim()) payload.mistral_api_key = mistralKey.trim();
      if (hfKey.trim()) payload.huggingface_api_key = hfKey.trim();

      await api.updateKeys(payload);
      setSaveSuccess(true);
      setOpenaiKey('');
      setSarvamKey('');
      setMistralKey('');
      setHfKey('');
      await loadKeys();
      onRefreshStatus();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save keys:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          <Key className="w-4 h-4" />
          <span>API Keys & Provider Configuration</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Settings & AI Providers</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure API keys for live cloud execution or enjoy the built-in offline demo capabilities.
        </p>
      </div>

      {/* System Health Card */}
      {status && (
        <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-500" />
              Runtime Health & Subsystems
            </span>
            <button
              onClick={onRefreshStatus}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="text-slate-400 text-[10px] font-semibold uppercase">FFmpeg Audio Engine</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Installed & Ready
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="text-slate-400 text-[10px] font-semibold uppercase">ChromaDB Store</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active & Indexed
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="text-slate-400 text-[10px] font-semibold uppercase">Mistral Summarizer</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold">
                {status.mistral_configured ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                ) : (
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Smart Fallback
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="text-slate-400 text-[10px] font-semibold uppercase">Sarvam AI (Indic)</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold">
                {status.sarvam_configured ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <span>Optional</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Configuration Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="p-6 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">API Credentials</h3>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Keys saved successfully!
              </span>
            )}
          </div>

          {/* Mistral AI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mistral AI API Key (Summarization & RAG Engine)
              </label>
              <button
                type="button"
                onClick={() => handleTestProvider('mistral', mistralKey)}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {testResults['mistral']?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Test Connection</span>
              </button>
            </div>
            <input
              type="password"
              placeholder={maskedKeys['mistral_api_key_masked'] || 'Enter Mistral AI API key (e.g. m_...)'}
              value={mistralKey}
              onChange={(e) => setMistralKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            {testResults['mistral'] && !testResults['mistral'].loading && (
              <div
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  testResults['mistral'].success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResults['mistral'].success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{testResults['mistral'].message}</span>
              </div>
            )}
          </div>

          {/* OpenAI Whisper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                OpenAI API Key (Whisper English Speech-to-Text)
              </label>
              <button
                type="button"
                onClick={() => handleTestProvider('openai', openaiKey)}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {testResults['openai']?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Test Connection</span>
              </button>
            </div>
            <input
              type="password"
              placeholder={maskedKeys['openai_api_key_masked'] || 'Enter OpenAI key (e.g. sk-proj-...)'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            {testResults['openai'] && !testResults['openai'].loading && (
              <div
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  testResults['openai'].success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResults['openai'].success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{testResults['openai'].message}</span>
              </div>
            )}
          </div>

          {/* Sarvam AI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sarvam AI API Key (Hindi & Hinglish Speech Engine)
              </label>
              <button
                type="button"
                onClick={() => handleTestProvider('sarvam', sarvamKey)}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {testResults['sarvam']?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Test Connection</span>
              </button>
            </div>
            <input
              type="password"
              placeholder={maskedKeys['sarvam_api_key_masked'] || 'Enter Sarvam AI Subscription Key'}
              value={sarvamKey}
              onChange={(e) => setSarvamKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            {testResults['sarvam'] && !testResults['sarvam'].loading && (
              <div
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  testResults['sarvam'].success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResults['sarvam'].success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{testResults['sarvam'].message}</span>
              </div>
            )}
          </div>

          {/* Hugging Face */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hugging Face Token (Vector Embeddings)
              </label>
              <button
                type="button"
                onClick={() => handleTestProvider('huggingface', hfKey)}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {testResults['huggingface']?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Test Connection</span>
              </button>
            </div>
            <input
              type="password"
              placeholder={maskedKeys['huggingface_api_key_masked'] || 'Enter Hugging Face Token (e.g. hf_...)'}
              value={hfKey}
              onChange={(e) => setHfKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            {testResults['huggingface'] && !testResults['huggingface'].loading && (
              <div
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  testResults['huggingface'].success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResults['huggingface'].success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{testResults['huggingface'].message}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Apply Credentials</span>
          </button>
        </div>
      </form>
    </div>
  );
};

