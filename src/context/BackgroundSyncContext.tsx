import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { COMMON_DRUGS } from '../constants/drugs';
import { searchDrugInfo } from '../services/geminiService';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export type SyncStatus = 'idle' | 'checking' | 'cached' | 'fetching_ai' | 'cooling_down' | 'paused' | 'error' | 'completed';

export interface BackgroundSyncContextType {
  isSyncing: boolean;
  isPaused: boolean;
  status: SyncStatus;
  currentDrug: string;
  cooldownRemaining: number;
  totalCount: number;
  checkedCount: number;
  cachedCount: number;
  aiSyncedCount: number;
  errorCount: number;
  logs: string[];
  isWidgetOpen: boolean;
  isWidgetMinimized: boolean;
  startSync: () => void;
  pauseSync: () => void;
  resumeSync: () => void;
  stopSync: () => void;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  toggleMinimize: () => void;
  clearLogs: () => void;
}

const BackgroundSyncContext = createContext<BackgroundSyncContextType | undefined>(undefined);

const safeId = (id: string) => id.trim().toLowerCase().replace(/[,/]/g, '').replace(/\s+/g, ' ');

export const BackgroundSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [currentDrug, setCurrentDrug] = useState<string>('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(COMMON_DRUGS.length);
  const [checkedCount, setCheckedCount] = useState<number>(0);
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [aiSyncedCount, setAiSyncedCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(true);

  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const activeSyncIndexRef = useRef<number>(0);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const waitWithCountdown = async (seconds: number, reason: string): Promise<boolean> => {
    setStatus('cooling_down');
    addLog(`⏳ ${reason} Waiting ${seconds}s cooldown to prevent API rate limits...`);
    
    for (let s = seconds; s > 0; s--) {
      if (isCancelledRef.current) return false;

      // Handle pause during countdown
      while (isPausedRef.current) {
        if (isCancelledRef.current) return false;
        await new Promise(r => setTimeout(r, 400));
      }

      setCooldownRemaining(s);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setCooldownRemaining(0);
    return true;
  };

  const startSync = async () => {
    if (isSyncing) {
      if (isPaused) {
        resumeSync();
      }
      return;
    }

    isCancelledRef.current = false;
    isPausedRef.current = false;
    setIsSyncing(true);
    setIsPaused(false);
    setIsWidgetOpen(true);
    setIsWidgetMinimized(false);
    setStatus('checking');
    addLog('🚀 Initializing background sync engine...');

    try {
      // 1. Fetch pre-existing drugs from Firestore to perform 0ms cache hits
      addLog('🔍 Pre-indexing existing drugs from Firestore (drugs_v3)...');
      const existingDrugs = new Set<string>();
      try {
        const snapshot = await getDocs(collection(db, 'drugs_v3'));
        snapshot.forEach(docSnap => {
          existingDrugs.add(docSnap.id.toLowerCase());
          const data = docSnap.data();
          if (data.name) existingDrugs.add(data.name.toLowerCase());
          if (Array.isArray(data.brandNamesLower)) {
            data.brandNamesLower.forEach((b: string) => existingDrugs.add(b.toLowerCase()));
          }
        });
        addLog(`📦 Loaded ${existingDrugs.size} cached drug & brand records. Cached items will skip with 0s delay!`);
      } catch (e: any) {
        addLog(`⚠️ Could not pre-fetch full list: ${e.message}. Checking documents individually.`);
      }

      const total = COMMON_DRUGS.length;
      setTotalCount(total);

      for (let i = activeSyncIndexRef.current; i < total; i++) {
        if (isCancelledRef.current) {
          addLog('🛑 Background sync stopped by user.');
          break;
        }

        while (isPausedRef.current) {
          if (isCancelledRef.current) break;
          setStatus('paused');
          await new Promise(r => setTimeout(r, 400));
        }

        activeSyncIndexRef.current = i;
        const drug = COMMON_DRUGS[i];
        setCurrentDrug(drug);
        setCheckedCount(i + 1);

        const safeNorm = safeId(drug);
        const lowerDrug = drug.trim().toLowerCase();

        // 2. Fast check: is drug in existing set?
        let isAlreadyCached = existingDrugs.has(safeNorm) || existingDrugs.has(lowerDrug);

        if (!isAlreadyCached) {
          // Direct single document check
          try {
            const docSnap = await getDoc(doc(db, 'drugs_v3', safeNorm));
            if (docSnap.exists()) {
              isAlreadyCached = true;
              existingDrugs.add(safeNorm);
            }
          } catch (_) {}
        }

        if (isAlreadyCached) {
          // RULE: If AI finds drug data in database, it goes IMMEDIATELY for next one (0s delay)
          setStatus('cached');
          setCachedCount(prev => prev + 1);
          addLog(`⏭️ [${i + 1}/${total}] ${drug} already in database. Skipping immediately.`);
          // Quick micro-yield so browser remains responsive
          await new Promise(r => setTimeout(r, 15));
          continue;
        }

        // 3. Not in database: AI call required!
        setStatus('fetching_ai');
        addLog(`🤖 [${i + 1}/${total}] Researching clinical data for "${drug}" with Gemini AI...`);

        let retryCount = 0;
        let success = false;

        while (retryCount < 2 && !success && !isCancelledRef.current) {
          try {
            const result = await searchDrugInfo(drug, 'en', null, false);
            success = true;
            existingDrugs.add(safeNorm);
            setAiSyncedCount(prev => prev + 1);

            const brandCount = Array.isArray(result.brandNames) ? result.brandNames.length : 0;
            addLog(`✅ [${i + 1}/${total}] Saved "${drug}" + ${brandCount} commercial brands to database!`);

            // RULE: Wait 45 seconds so the AI doesn't hit its rate limit
            const cooldownOk = await waitWithCountdown(45, `AI sync complete for "${drug}".`);
            if (!cooldownOk) break;

          } catch (err: any) {
            const errMsg = err?.message || String(err);
            if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
              addLog(`⚠️ Rate limit (429) hit on "${drug}". Cooling down 60s before retrying...`);
              const cooldownOk = await waitWithCountdown(60, `Rate limit backoff for "${drug}".`);
              if (!cooldownOk) break;
              retryCount++;
            } else {
              addLog(`❌ Failed to sync "${drug}": ${errMsg}`);
              setErrorCount(prev => prev + 1);
              // Wait 5s on normal error before continuing
              await waitWithCountdown(5, `Error backoff.`);
              break;
            }
          }
        }
      }

      if (!isCancelledRef.current) {
        setStatus('completed');
        addLog('🎉 Background sync reached end of directory list!');
      }

    } catch (fatalErr: any) {
      addLog(`❌ Fatal error in background sync: ${fatalErr.message}`);
      setStatus('error');
    } finally {
      setIsSyncing(false);
      setIsPaused(false);
      setCooldownRemaining(0);
    }
  };

  const pauseSync = () => {
    if (!isSyncing || isPaused) return;
    isPausedRef.current = true;
    setIsPaused(true);
    setStatus('paused');
    addLog('⏸️ Background sync paused.');
  };

  const resumeSync = () => {
    if (!isSyncing || !isPaused) return;
    isPausedRef.current = false;
    setIsPaused(false);
    setStatus('checking');
    addLog('▶️ Background sync resumed.');
  };

  const stopSync = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setIsSyncing(false);
    setIsPaused(false);
    setStatus('idle');
    setCooldownRemaining(0);
    addLog('⏹️ Background sync stopped.');
  };

  const openWidget = () => setIsWidgetOpen(true);
  const closeWidget = () => setIsWidgetOpen(false);
  const toggleWidget = () => setIsWidgetOpen(prev => !prev);
  const toggleMinimize = () => setIsWidgetMinimized(prev => !prev);

  return (
    <BackgroundSyncContext.Provider
      value={{
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
        openWidget,
        closeWidget,
        toggleWidget,
        toggleMinimize,
        clearLogs
      }}
    >
      {children}
    </BackgroundSyncContext.Provider>
  );
};

export const useBackgroundSync = () => {
  const context = useContext(BackgroundSyncContext);
  if (!context) {
    throw new Error('useBackgroundSync must be used within a BackgroundSyncProvider');
  }
  return context;
};
