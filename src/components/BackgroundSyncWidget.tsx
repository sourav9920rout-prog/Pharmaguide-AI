import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Square, 
  Minimize2, 
  Maximize2, 
  X, 
  RefreshCw, 
  Database, 
  Bot, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Terminal
} from 'lucide-react';
import { useBackgroundSync } from '../context/BackgroundSyncContext';

export function BackgroundSyncWidget() {
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
    isWidgetOpen,
    isWidgetMinimized,
    startSync,
    pauseSync,
    resumeSync,
    stopSync,
    closeWidget,
    toggleMinimize,
    clearLogs
  } = useBackgroundSync();

  if (!isWidgetOpen) return null;

  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((checkedCount / totalCount) * 100)) : 0;

  const getStatusBadge = () => {
    switch (status) {
      case 'cooling_down':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock size={13} />
            Cooldown ({cooldownRemaining}s)
          </span>
        );
      case 'fetching_ai':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
            <Bot size={13} className="animate-bounce" />
            AI Generating
          </span>
        );
      case 'cached':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30">
            <CheckCircle2 size={13} />
            Instant Skip (0s)
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <RefreshCw size={13} className="animate-spin" />
            Checking DB
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-variant text-on-surface-variant border border-glass-border">
            <Pause size={13} />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle2 size={13} />
            Complete
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-variant/50 text-on-surface-variant border border-glass-border">
            Idle
          </span>
        );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full pointer-events-none">
      <AnimatePresence mode="wait">
        {isWidgetMinimized ? (
          /* Minimized Floating Pill */
          <motion.div
            key="minimized"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto ml-auto w-fit flex items-center gap-3 px-4 py-2.5 bg-surface/90 backdrop-blur-xl border border-glass-border rounded-full shadow-2xl hover:border-primary/50 transition-all cursor-pointer select-none"
            onClick={toggleMinimize}
          >
            <div className="relative flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
              {isSyncing && !isPaused && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">Background Sync</span>
                {getStatusBadge()}
              </div>
              <span className="text-[11px] text-on-surface-variant font-mono">
                {checkedCount} / {totalCount} ({progressPercent}%)
                {cooldownRemaining > 0 && ` · Cooldown: ${cooldownRemaining}s`}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize();
              }}
              className="p-1 hover:bg-white/10 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
              title="Expand Sync Monitor"
            >
              <Maximize2 size={15} />
            </button>
          </motion.div>
        ) : (
          /* Full Expanded Floating Monitor */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="pointer-events-auto bg-surface/95 backdrop-blur-2xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-glass-border/50 bg-surface-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Database size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Background Sync Engine</h4>
                  <p className="text-[11px] text-on-surface-variant">Auto fills missing drugs & brand names</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMinimize}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Minimize"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  onClick={closeWidget}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Close Widget"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Active Status Banner */}
            <div className="px-5 py-3 border-b border-glass-border/30 flex items-center justify-between gap-2 bg-black/5 dark:bg-white/5">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant">
                  Current Target
                </span>
                <span className="text-sm font-extrabold text-on-surface truncate max-w-[220px]">
                  {currentDrug || "Standing by..."}
                </span>
              </div>
              <div>
                {getStatusBadge()}
              </div>
            </div>

            {/* Cooldown Highlight Box when in cooldown */}
            {cooldownRemaining > 0 && (
              <div className="mx-5 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock size={18} className="animate-spin" />
                  <span className="text-xs font-bold">AI Rate-Limit Protection</span>
                </div>
                <span className="text-base font-black text-amber-400 font-mono">
                  {cooldownRemaining}s remaining
                </span>
              </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-2 px-5 py-3 text-center">
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

            {/* Progress Bar */}
            <div className="px-5 pb-2">
              <div className="flex justify-between text-[11px] font-semibold text-on-surface-variant mb-1">
                <span>Directory Progress</span>
                <span>{progressPercent}% ({checkedCount} / {totalCount})</span>
              </div>
              <div className="w-full h-2 bg-surface-variant/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Terminal Log Console */}
            <div className="px-5 py-2 flex-grow min-h-[140px] max-h-[180px] flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <Terminal size={12} />
                  Live Sync Log
                </span>
                <button
                  onClick={clearLogs}
                  className="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="bg-black/80 rounded-xl p-2.5 font-mono text-[11px] text-green-400/90 overflow-y-auto flex-grow custom-scrollbar border border-white/5 space-y-1">
                {logs.length === 0 ? (
                  <span className="text-white/40 italic">Engine ready. Click &quot;Start Sync&quot; to begin.</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="leading-tight break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rule Callout */}
            <div className="px-5 py-1.5 text-[11px] text-on-surface-variant/70 italic text-center">
              💡 Keep this tab open in background. If cached in DB, skips in 0s. If AI generated, waits 45s cooldown.
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-glass-border/50 bg-surface-variant/20 flex items-center justify-between gap-3">
              {!isSyncing ? (
                <button
                  onClick={startSync}
                  className="w-full py-2.5 px-4 bg-primary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-md transition-all"
                >
                  <Play size={14} />
                  Start Background Sync
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={resumeSync}
                      className="flex-1 py-2.5 px-3 bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-green-600 transition-colors shadow-sm"
                    >
                      <Play size={14} />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={pauseSync}
                      className="flex-1 py-2.5 px-3 bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-600 transition-colors shadow-sm"
                    >
                      <Pause size={14} />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={stopSync}
                    className="flex-1 py-2.5 px-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/30 transition-colors"
                  >
                    <Square size={14} />
                    Stop
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
