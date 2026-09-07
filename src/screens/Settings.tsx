import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  Save, 
  Trash2, 
  CheckCircle2, 
  ArrowLeft, 
  Database, 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Bot, 
  ExternalLink 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useBackgroundSync } from '../context/BackgroundSyncContext';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const navigate = useNavigate();

  const {
    isSyncing,
    isPaused,
    status,
    currentDrug,
    cooldownRemaining,
    totalCount,
    checkedCount,
    cachedCount,
    aiSyncedCount,
    errorCount,
    logs,
    startSync,
    pauseSync,
    resumeSync,
    stopSync,
    openWidget,
    clearLogs
  } = useBackgroundSync();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('user_gemini_api_key', apiKey.trim());
    window.dispatchEvent(new Event('api-key-updated'));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem('user_gemini_api_key');
    window.dispatchEvent(new Event('api-key-updated'));
    setApiKey('');
  };

  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((checkedCount / totalCount) * 100)) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <nav className="mb-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-secondary font-bold hover:opacity-80 transition-opacity group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Back</span>
        </button>
      </nav>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <SettingsIcon className="text-primary" size={20} />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Application Settings</h2>
        </div>

        <div className="space-y-6">
          {/* API Key Setting */}
          <div className="p-6 bg-glass rounded-2xl border border-glass-border">
            <div className="flex items-center gap-2 mb-4">
              <Key className="text-secondary" size={18} />
              <h3 className="text-lg font-bold text-on-surface">Custom Gemini API Key</h3>
            </div>
            <p className="text-sm text-on-surface-variant/70 mb-6 leading-relaxed">
              Add your own Google Gemini API key to enjoy uninterrupted background sync and higher rate limits. 
              This key is stored locally in your browser and is never sent to third parties.
              <br/><br/>
              Don&apos;t have one? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-secondary font-bold hover:underline">Get your free Gemini API key here</a>.
            </p>
            
            <div className="space-y-4">
              <input 
                type="password"
                className="w-full glass-input p-4"
                placeholder="Enter your Gemini API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="flex gap-3">
                <button 
                  onClick={handleSave}
                  className="flex-grow bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
                >
                  {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  {isSaved ? 'Saved Successfully' : 'Save API Key'}
                </button>
                <button 
                  onClick={handleClear}
                  className="px-4 bg-glass text-on-surface-variant/40 hover:text-error hover:bg-error/10 py-3 rounded-xl font-bold transition-all border border-glass-border"
                  title="Clear Key"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Smart Background Sync Tool */}
          <div className="p-6 bg-glass rounded-2xl border border-glass-border">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Database className="text-secondary" size={18} />
                <h3 className="text-lg font-bold text-on-surface">Background Sync Engine</h3>
              </div>
              <button
                onClick={openWidget}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Floating Monitor</span>
                <ExternalLink size={12} />
              </button>
            </div>
            <p className="text-sm text-on-surface-variant/70 mb-4 leading-relaxed">
              Auto fills missing drug profiles and indexes their commercial brand names in the background.
              <br/>
              <strong>Smart Rate Limit Rule:</strong> If drug data already exists in the database, it skips immediately to the next (0s delay). If missing, it fetches clinical data &amp; brand names with AI and then waits <strong>45 seconds</strong> before the next item to prevent hitting API limits.
            </p>
            
            {/* Status & Cooldown Notice */}
            {isSyncing && (
              <div className="mb-4 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-glass-border flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface">Target: {currentDrug || "Initializing..."}</span>
                  <span className="capitalize text-primary font-mono">{status.replace('_', ' ')}</span>
                </div>
                {cooldownRemaining > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-500 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="animate-spin" />
                      45s Rate-Limit Cooldown Active
                    </span>
                    <span className="font-mono font-bold text-sm">{cooldownRemaining}s</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div className="p-2 rounded-xl bg-surface-variant/30 border border-glass-border/30">
                <div className="text-[10px] font-bold uppercase text-on-surface-variant">Checked</div>
                <div className="text-sm font-extrabold text-on-surface mt-0.5">{checkedCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="text-[10px] font-bold uppercase text-green-500">Cached (0s)</div>
                <div className="text-sm font-extrabold text-green-400 mt-0.5">{cachedCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <div className="text-[10px] font-bold uppercase text-primary">AI Synced</div>
                <div className="text-sm font-extrabold text-primary mt-0.5">{aiSyncedCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-[10px] font-bold uppercase text-red-400">Errors</div>
                <div className="text-sm font-extrabold text-red-400 mt-0.5">{errorCount}</div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-on-surface mb-2">
                <span className="font-bold">Progress: {checkedCount} / {totalCount}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-on-surface/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                {!isSyncing ? (
                  <button 
                    onClick={startSync}
                    className="flex-grow bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md"
                  >
                    <Play size={18} />
                    Start Background Sync
                  </button>
                ) : (
                  <>
                    {isPaused ? (
                      <button 
                        onClick={resumeSync}
                        className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all"
                      >
                        <Play size={18} />
                        Resume
                      </button>
                    ) : (
                      <button 
                        onClick={pauseSync}
                        className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all"
                      >
                        <Pause size={18} />
                        Pause
                      </button>
                    )}
                    <button 
                      onClick={stopSync}
                      className="flex-1 bg-error/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-error transition-all"
                    >
                      <Square size={18} />
                      Stop Sync
                    </button>
                  </>
                )}
              </div>
              
              {/* Logs */}
              {logs.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1 text-[11px] text-on-surface-variant font-semibold">
                    <span>Sync Activity Logs</span>
                    <button onClick={clearLogs} className="hover:text-on-surface">Clear</button>
                  </div>
                  <div className="bg-black/80 border border-glass-border p-4 rounded-xl font-mono text-[10px] text-green-400/90 whitespace-pre-wrap h-44 overflow-y-auto custom-scrollbar">
                    {logs.join('\n')}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-glass rounded-2xl border border-glass-border">
            <h3 className="text-lg font-bold text-on-surface mb-2">Data Privacy &amp; Offline Persistence</h3>
            <p className="text-sm text-on-surface-variant/70 leading-relaxed">
              PharmaGuide AI prioritizes your privacy. All user profiles and API configurations are stored 
              locally on your device. Database sync directly populates the cloud drug catalog and brand mapping collections.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
