import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, ChevronRight, Search, ArrowLeftRight, ClipboardList, Trash2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { getHistory, clearHistory, SearchHistoryItem } from '../services/historyService';

export default function History() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const navigate = useNavigate();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    const allHistory = getHistory();
    const visibleHistory = allHistory.filter(item => item.type !== 'drug_translation');
    setHistory(visibleHistory);
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'drug': return <Search size={18} className="text-primary" />;
      case 'interaction': return <ArrowLeftRight size={18} className="text-secondary" />;
      default: return <HistoryIcon size={18} className="text-on-surface-variant" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'drug': return 'Drug Search';
      case 'interaction': return 'Interaction Check';
      default: return 'Search';
    }
  };

  const getLink = (item: SearchHistoryItem) => {
    switch (item.type) {
      case 'drug': return `/drug/${item.data?.id || encodeURIComponent(item.query.toLowerCase().replace(/\s+/g, '-'))}`;
      case 'interaction': return `/interactions?q=${encodeURIComponent(item.query)}`;
      default: return '/';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <nav className="mb-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-secondary font-bold hover:opacity-80 transition-opacity group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Back</span>
        </button>
      </nav>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-on-surface-variant/40 mb-2">
            <span className="text-[10px] tracking-widest uppercase font-bold">Activity</span>
            <ChevronRight size={12} />
            <span className="text-[10px] tracking-widest uppercase font-bold text-primary">History</span>
          </div>
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight">Recent Searches</h2>
        </div>
        {history.length > 0 && (
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-all font-bold text-sm"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 bg-glass rounded-2xl flex items-center justify-center mb-4 border border-glass-border">
            <HistoryIcon size={32} className="text-on-surface-variant/30" />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">No history yet</h3>
          <p className="text-on-surface-variant/60 max-w-md">
            Your recent drug searches and interaction checks will appear here for quick access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link 
                to={getLink(item)}
                className="glass-card p-6 flex flex-col h-full hover:scale-[1.02] active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border group-hover:border-primary/30 transition-colors">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 block">
                      {getLabel(item.type)}
                    </span>
                    <span className="text-xs text-on-surface-variant/40">
                      {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-on-surface line-clamp-2 leading-tight">
                  {item.type === 'drug' && item.data?.name ? item.data.name : item.query.split('_')[0]}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
