import React, { useState, useEffect } from 'react';
import { Search, History, Activity, ArrowLeftRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { getHistory, SearchHistoryItem } from '../services/historyService';
import { useAppConfig } from '../context/ConfigContext';
import { useTranslation } from '../translations';
import { DrugInput } from '../components/DrugInput';

const DAILY_INSIGHTS = [
  { drug: "Lisinopril", text: "Recent guidelines suggest monitoring renal function more closely when combining", suffix: "with NSAIDs." },
  { drug: "Metformin", text: "Always check eGFR before starting", suffix: "; contraindicated if eGFR < 30 mL/min/1.73 m²." },
  { drug: "Warfarin", text: "Cranberry juice and certain antibiotics can significantly increase the INR in patients taking", suffix: "." },
  { drug: "Omeprazole", text: "Long-term use of", suffix: "may be associated with magnesium deficiency and increased fracture risk." },
  { drug: "Amoxicillin", text: "When prescribing", suffix: "for otitis media, ensure the dose is adequate (often 90 mg/kg/day) to overcome resistance." },
  { drug: "Atorvastatin", text: "Grapefruit juice can increase the serum concentration of", suffix: ", raising the risk of myopathy." },
  { drug: "Sertraline", text: "Monitor for serotonin syndrome when combining", suffix: "with other serotonergic agents like triptans or tramadol." }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const { config, setMode, setLanguage } = useAppConfig();
  const { t } = useTranslation(config.language);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const [dailyInsight, setDailyInsight] = useState(DAILY_INSIGHTS[0]);
  const navigate = useNavigate();

  useEffect(() => {
    const history = getHistory();
    setRecentSearches(history.slice(0, 8)); // Show only top 8 on home
    
    // Calculate day of the year to pick a daily insight
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    setDailyInsight(DAILY_INSIGHTS[dayOfYear % DAILY_INSIGHTS.length]);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.trim();
    const drugId = query.toLowerCase().replace(/\s+/g, '-');
    
    navigate(`/drug/${drugId}?lang=${config.language}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'drug': return <Search size={14} className="text-primary" />;
      case 'interaction': return <ArrowLeftRight size={14} className="text-secondary" />;
      default: return <History size={14} className="text-on-surface-variant" />;
    }
  };

  const getLink = (item: SearchHistoryItem) => {
    switch (item.type) {
      case 'drug': return `/drug/${item.data?.id || encodeURIComponent(item.query.toLowerCase().replace(/\s+/g, '-'))}?lang=${config.language}`;
      case 'interaction': return `/interactions?q=${encodeURIComponent(item.query)}`;
      default: return '/';
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Search Section */}
      <section className="max-w-3xl">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-extrabold text-on-surface mb-2 tracking-tight"
        >
          {t("clinicalIntelligence")}{" "}<span className="text-secondary">{t("atYourFingertips")}</span>
        </motion.h2>
        
        <div className="relative group mt-8">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="text-on-surface-variant/40 w-6 h-6" />
          </div>
          <DrugInput 
            className="w-full h-16 pl-14 pr-[140px] glass-input focus:ring-2 focus:ring-primary/50 text-lg placeholder:text-on-surface-variant/30 transition-all duration-200 shadow-ambient text-on-surface outline-none" 
            placeholder={t("searchPlaceholder")} 
            type="text"
            value={searchQuery}
            onChange={setSearchQuery}
            onEnter={handleSearch}
          />
          <div className="absolute right-2 inset-y-0 flex items-center">
            <button 
              onClick={handleSearch}
              className="bg-primary text-white h-[48px] px-6 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2"
            >
              <Activity size={18} />
              <span className="hidden sm:inline">{t("search")}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Recent Search History */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-12 glass-card p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History className="text-secondary w-5 h-5" />
              <h3 className="text-xl font-bold text-on-surface">{t("recentSearches")}</h3>
            </div>
            <Link to="/history" className="text-sm font-bold text-primary hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {recentSearches.length > 0 ? (
              recentSearches.map((item) => (
                <Link 
                  key={item.id}
                  to={getLink(item)}
                  className="bg-glass px-4 py-2.5 rounded-xl flex items-center gap-2 border border-glass-border hover:bg-white/10 transition-all cursor-pointer group"
                >
                  {getIcon(item.type)}
                  <span className="text-sm font-medium text-on-surface-variant line-clamp-1 max-w-[150px]">{item.type === 'drug' && item.data?.name ? item.data.name : item.query.split('_')[0]}</span>
                </Link>
              ))
            ) : (
              <p className="text-on-surface-variant/20 text-sm italic">No recent activity found.</p>
            )}
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-glass p-6 rounded-2xl border border-glass-border">
              <span className="text-[10px] tracking-widest uppercase font-bold text-secondary mb-2 block">{t("clinicalInsights")}</span>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {dailyInsight.text}{" "}
                <span className="font-bold text-secondary">{dailyInsight.drug}</span>
                {dailyInsight.suffix.startsWith('.') || dailyInsight.suffix.startsWith(';') || dailyInsight.suffix.startsWith(',') ? dailyInsight.suffix : ` ${dailyInsight.suffix}`}
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
