export type SearchHistoryItem = {
  id: string;
  type: 'drug' | 'interaction' | 'drug_translation';
  query: string;
  cacheKey?: string;
  timestamp: number;
  data: any;
};

const HISTORY_KEY = 'pharmaguide_history_v2';

export const getHistory = (): SearchHistoryItem[] => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse history', e);
  }
  return [];
};

export const saveToHistory = (type: SearchHistoryItem['type'], query: string, data: any, cacheKey?: string) => {
  if (typeof localStorage === 'undefined') return;
  const history = getHistory();
  
  // Check if it already exists, if so remove it to put it at the top
  const existingIndex = history.findIndex(item => {
    if (type === 'drug' && item.type === 'drug') {
      return (cacheKey && item.cacheKey === cacheKey) || (item.query.toLowerCase() === query.toLowerCase());
    }
    if (type === 'interaction' && item.type === 'interaction') {
      return (cacheKey && item.cacheKey === cacheKey) || (item.query.toLowerCase() === query.toLowerCase());
    }
    if (type === 'drug_translation' && item.type === 'drug_translation') {
      return (cacheKey && item.cacheKey === cacheKey) || (item.query === query);
    }
    return false;
  });

  if (existingIndex >= 0) {
    history.splice(existingIndex, 1);
  }

  const newItem: SearchHistoryItem = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    query,
    cacheKey: cacheKey || query,
    timestamp: Date.now(),
    data
  };

  history.unshift(newItem);
  
  // Keep only the last 50 items
  if (history.length > 50) {
    history.pop();
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const getFromCache = (type: SearchHistoryItem['type'], queryOrCacheKey: string) => {
  const history = getHistory();
  const item = history.find(item => 
    item.type === type && 
    ((item.cacheKey && item.cacheKey === queryOrCacheKey) || (item.query.toLowerCase() === queryOrCacheKey.toLowerCase()))
  );
  return item ? item.data : null;
};

export const clearHistory = () => {
  if (typeof localStorage === 'undefined') return;
  const apiKey = localStorage.getItem('user_gemini_api_key');
  localStorage.clear();
  if (apiKey) localStorage.setItem('user_gemini_api_key', apiKey);
};