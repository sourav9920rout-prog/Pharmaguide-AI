import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Brain, Clock, Pill, AlertTriangle, AlertCircle, Bookmark, Loader2, Activity, Utensils, Globe, ChevronDown, Fingerprint, ShieldAlert, ShieldCheck, RefreshCw, Copy, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { searchDrugInfo, translateDrugInfo } from '../services/geminiService';
import { getFromCache } from '../services/historyService';
import { getDefinition } from '../lib/medicalDictionary';
import { Drug } from '../types';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTranslation } from '../translations';
import { useAppConfig, LANGUAGES } from '../context/ConfigContext';

export default function DrugProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { config } = useAppConfig();
  const { t } = useTranslation(config.language);
  
  const currentLang = config.language;

  const [drug, setDrug] = useState<Drug | null>(null);
  const [originalDrug, setOriginalDrug] = useState<Drug | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'off-label' | 'interactions'>('overview');
  const contentRef = useRef<HTMLDivElement>(null);
  const { profile } = useUserProfile();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  const fetchDrugData = async (forceRegenerate = false) => {
    setLoading(!forceRegenerate);
    if (forceRegenerate) setIsResearching(true);
    setError(null);
    
    let fetchedDrug = null;
    let finalDrug = null;

    // When the user has a profile, we should bypass local hardcoded data 
    // or enhance it. Best is to just fetch from AI to get the personalizedAdvice.
    const useAI = profile && profile.medications.trim().length > 0;

    // Determine the base original drug
    if (!forceRegenerate && originalDrug && originalDrug.id === id) {
      fetchedDrug = originalDrug;
    } else {
      try {
        let drugName = id?.replace(/-/g, ' ');

        if (drugName) {
          // Always fetch English first to have a solid base
          const aiDrug = await searchDrugInfo(drugName, 'en', profile, forceRegenerate);
          fetchedDrug = {
            ...aiDrug,
            imageUrl: aiDrug.imageUrl || `https://picsum.photos/seed/${drugName}/400/300`
          };
        }
      } catch (err: any) {
        console.error("Error fetching drug info:", err);
        setError(err.message || "Failed to fetch drug information. Please check your API key.");
        setLoading(false);
        setIsResearching(false);
        return;
      }
      
      if (fetchedDrug) {
        setOriginalDrug(fetchedDrug as Drug);
      }
    }

    // Now apply translation
    if (fetchedDrug) {
      if (currentLang === 'en') {
        finalDrug = fetchedDrug;
      } else {
        setTranslating(true);
        try {
          const targetLangName = LANGUAGES.find(l => l.code === currentLang)?.name || 'English';
          finalDrug = await translateDrugInfo(fetchedDrug, targetLangName, forceRegenerate);
        } catch (e) {
          console.error("Translation fail:", e);
          finalDrug = fetchedDrug;
        } finally {
          setTranslating(false);
        }
      }
      setDrug(finalDrug as Drug);
    }
    
    setLoading(false);
    setIsResearching(false);
  };

  useEffect(() => {
    fetchDrugData(false);
  }, [id, profile, currentLang]);

  if (loading || translating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-on-surface-variant font-medium animate-pulse">
          {translating ? "Translating..." : "Consulting PharmaGuide AI..."}
        </p>
      </div>
    );
  }

  if (error || !drug) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center">
          <AlertCircle className="text-error w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-on-surface">Analysis Failed</h2>
          <p className="text-on-surface-variant">{error || "We couldn't find information for this drug."}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleBack} className="px-6 py-3 bg-glass border border-glass-border rounded-xl font-bold text-on-surface hover:bg-white/5 transition-all">
            Go Back
          </button>
          <Link to="/settings" className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg">
            Check API Key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={contentRef} className="space-y-8 pb-20 print-content">
      {/* Drug Identity & Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="mb-4">
            <button onClick={handleBack} className="flex items-center gap-2 text-secondary font-bold hover:opacity-80 transition-opacity group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-[0.4em]">{t("backToDirectory") || "Back to Directory"}</span>
            </button>
          </nav>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-extrabold text-on-surface tracking-tight mb-2"
          >
            {drug.name}
          </motion.h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(drug.category || []).map(cat => (
              <div key={cat} className="group relative inline-block">
                <span className="px-3 py-1 bg-glass text-on-surface-variant/60 rounded-full text-[10px] font-bold uppercase tracking-wider border border-glass-border cursor-help inline-block">
                  {cat}
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-surface/80 backdrop-blur-xl border border-outline-variant/20 rounded-3xl shadow-2xl text-[13px] text-on-surface opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-50 pointer-events-none leading-relaxed">
                  {getDefinition(cat)}
                </div>
              </div>
            ))}
            <button
              onClick={() => fetchDrugData(true)}
              disabled={isResearching}
              className="px-3 py-1 bg-glass hover:bg-glass/80 text-primary flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-glass-border transition-colors ml-1 disabled:opacity-50"
              title="Research from AI again (Bypass cache)"
            >
              <RefreshCw size={12} className={isResearching ? "animate-spin" : ""} />
              {isResearching ? "Researching..." : "Research"}
            </button>
          </div>

          {drug.brandNames && drug.brandNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">
                Brands:
              </span>
              {drug.brandNames.map((brand) => (
                <span 
                  key={brand} 
                  className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-semibold"
                >
                  {brand}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-col items-end w-full md:w-auto mt-6 md:mt-0">
          <div className="glass-nav p-1.5 rounded-2xl flex sm:flex-nowrap items-center w-full md:w-fit shadow-ambient border border-glass-border overflow-x-auto overflow-y-hidden hide-scrollbar">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap",
                activeTab === 'overview' ? "bg-glass shadow-inner text-on-surface" : "text-on-surface-variant/40 hover:text-on-surface-variant/60"
              )}
            >
              <Lightbulb size={16} className="shrink-0" />
              <span>{t("overview")}</span>
            </button>
            <button 
              onClick={() => setActiveTab('off-label')}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap",
                activeTab === 'off-label' ? "bg-glass shadow-inner text-on-surface" : "text-on-surface-variant/40 hover:text-on-surface-variant/60"
              )}
            >
              <Bookmark size={16} className="shrink-0" />
              <span>{t("offLabel")}</span>
            </button>
            <button 
              onClick={() => setActiveTab('interactions')}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap",
                activeTab === 'interactions' ? "bg-glass shadow-inner text-on-surface" : "text-on-surface-variant/40 hover:text-on-surface-variant/60"
              )}
            >
              <Activity size={16} className="shrink-0" />
              <span>{t("interactions")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Personalized Advice Banner */}
          {drug.personalizedAdvice && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "md:col-span-12 p-6 rounded-3xl border shadow-lg flex flex-col md:flex-row gap-6 items-start",
                drug.personalizedAdvice.hasInteractions 
                  ? "bg-error/10 border-error/30" 
                  : "bg-tertiary/10 border-tertiary/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                drug.personalizedAdvice.hasInteractions 
                  ? "bg-error/20 border-error/50 text-error" 
                  : "bg-tertiary/20 border-tertiary/50 text-tertiary"
              )}>
                {drug.personalizedAdvice.hasInteractions ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Fingerprint size={16} className={drug.personalizedAdvice.hasInteractions ? "text-error" : "text-tertiary"} />
                  <h2 className={cn(
                    "font-bold text-lg",
                    drug.personalizedAdvice.hasInteractions ? "text-error" : "text-tertiary"
                  )}>
                    {t("personalizedInsight")}
                  </h2>
                </div>
                <p className="text-on-surface-variant leading-relaxed text-[15px]">
                  {drug.personalizedAdvice.message}
                </p>
                {drug.personalizedAdvice.relevantMedications && drug.personalizedAdvice.relevantMedications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-60 flex items-center h-7">Your current meds checked:</span>
                    {(drug.personalizedAdvice.relevantMedications || []).map(med => (
                      <span key={med} className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        drug.personalizedAdvice!.hasInteractions 
                          ? "bg-error/5 border-error/20 text-error" 
                          : "bg-tertiary/5 border-tertiary/20 text-tertiary"
                      )}>
                        {med}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Mechanism Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-8 glass-card p-8 relative overflow-hidden"
          >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Brain size={160} className="text-on-surface" />
          </div>
          <div className="relative z-10">
            <header className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
                <Brain className="text-secondary" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-on-surface">{t("mechanismOfAction") || "How it works"}</h2>
            </header>
            <p className="text-lg leading-relaxed text-on-surface-variant/70 max-w-2xl font-body">
              {drug.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="p-4 bg-glass rounded-2xl flex-1 min-w-[200px] border border-glass-border">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 block mb-1">Target</span>
                <span className="font-bold text-on-surface">Central Nervous System</span>
              </div>
              <div className="p-4 bg-glass rounded-2xl flex-1 min-w-[200px] border border-glass-border">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 block mb-1">Primary Effect</span>
                <span className="font-bold text-on-surface">{drug.primaryUse}</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Timing Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4 glass-card p-8 flex flex-col justify-between border-primary/20 bg-primary/10"
        >
          {drug.timing && (
            <div>
              <header className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
                  <Clock className="text-on-surface" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-on-surface">Timing</h2>
              </header>
              <div className="space-y-4">
                <div className="flex items-start gap-6 border-b border-glass-border pb-4">
                  <span className="text-on-surface-variant/50 text-sm shrink-0 w-24 pt-0.5">{t("frequency")}</span>
                  <span className="font-bold text-on-surface text-left leading-relaxed">{drug.timing?.frequency}</span>
                </div>
                <div className="flex items-start gap-6">
                  <span className="text-on-surface-variant/50 text-sm shrink-0 w-24 pt-0.5">{t("food")}</span>
                  <span className="font-bold text-on-surface text-left leading-relaxed">{drug.timing?.food}</span>
                </div>
              </div>
            </div>
          )}
          {drug.timing?.note && (
            <div className="mt-8 p-4 bg-glass rounded-2xl border border-glass-border">
              <p className="text-sm italic text-on-surface-variant/80">"{drug.timing.note}"</p>
            </div>
          )}
        </motion.section>

        {/* Dosage Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-6 glass-card p-8"
        >
          <header className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
              <Pill className="text-secondary" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Standard Dosage</h2>
          </header>
          {drug.dosage && (
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-glass rounded-3xl border border-glass-border flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 block mb-2">{t("adult")}</span>
                <span className="text-lg font-bold text-secondary leading-tight">{drug.dosage?.adult}</span>
              </div>
              <div className="p-6 bg-glass rounded-3xl border border-glass-border flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 block mb-2">{t("pediatric")}</span>
                <span className="text-lg font-bold text-secondary leading-tight">{drug.dosage?.pediatric}</span>
              </div>
            </div>
          )}
          {drug.dosage?.max && (
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-tertiary/20 text-tertiary rounded-xl w-fit border border-tertiary/30">
              <AlertTriangle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{drug.dosage.max}</span>
            </div>
          )}
        </motion.section>

        {/* Safety Profile */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-6 glass-card p-8"
        >
          <header className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
              <AlertCircle className="text-tertiary" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Safety Profile</h2>
          </header>
          {drug.safety && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0"></div>
                <div>
                  <span className="font-bold text-on-surface">{t("commonEffects") || "Common Effects"}</span>
                  <p className="text-on-surface-variant/50 text-sm mt-1">{drug.safety?.common}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 bg-[#c5e4e8] rounded-2xl border border-[#c4dfee]">
                <div className="w-2 h-2 rounded-full bg-[#f83838] mt-2 shrink-0"></div>
                <div>
                  <span className="font-bold text-[#f83838]">{t("seriousEffects") || "Serious Effects"}</span>
                  <p className="text-[#f50838] border-[#f20837] font-medium text-sm mt-1">{drug.safety?.serious}</p>
                </div>
              </div>
            </div>
          )}
        </motion.section>
      </div>
      ) : activeTab === 'off-label' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <header className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
              <Bookmark className="text-secondary" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">{t("supportedOffLabel") || "Off-Label Uses"}</h2>
          </header>
          
          {drug.offLabelUses && drug.offLabelUses.length > 0 ? (
            <div className="space-y-6">
              {drug.offLabelUses.map((use, idx) => (
                <div key={idx} className="p-6 bg-glass rounded-3xl border border-glass-border">
                  <h3 className="text-xl font-bold text-on-surface mb-3">{use.use}</h3>
                  <p className="text-on-surface-variant/80 leading-relaxed mb-4">{use.explanation}</p>
                  <div className="flex items-center justify-between gap-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="flex items-start gap-2 overflow-hidden">
                      <Bookmark size={16} className="text-primary shrink-0 mt-0.5" />
                      <a 
                        href={use.reference.startsWith('http') ? use.reference : `https://${use.reference}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-on-surface-variant/60 italic truncate hover:text-primary transition-colors"
                      >
                        <span className="font-bold text-primary/80 not-italic">Reference: </span>
                        {use.reference}
                      </a>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(use.reference.startsWith('http') ? use.reference : `https://${use.reference}`).then(() => alert('Copied to clipboard!'))}
                      className="text-primary hover:text-primary/80 p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy URL"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-on-surface-variant/50">
              <p>No common off-label uses found for this medication.</p>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <header className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
              <Activity className="text-error" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Drug Interactions</h2>
          </header>

          <div className="bg-glass border border-glass-border p-5 rounded-2xl flex gap-4 shadow-ambient mb-8">
            <Info className="text-secondary shrink-0" size={20} />
            <div>
              <p className="text-on-surface-variant/60 text-xs leading-relaxed">
                Although broad interaction summaries may suggest limited concern, deeper pharmacological evaluation and context-specific evidence may classify the interaction as moderate under certain clinical conditions.
              </p>
            </div>
          </div>
          
          {drug.interactions && drug.interactions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...drug.interactions]
                .sort((a, b) => {
                  const order: Record<string, number> = { 'SEVERE': 0, 'MODERATE': 1, 'MILD': 2 };
                  return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
                })
                .map((interaction, idx) => (
                <div key={idx} className="p-6 bg-glass rounded-3xl border border-glass-border flex flex-col justify-between">
                  <Link 
                    to={`/interactions?q=${encodeURIComponent(drug.name)},${encodeURIComponent(interaction.interactingDrug)}`} 
                    className="block hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-on-surface">{interaction.interactingDrug}</h3>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        interaction.severity === 'SEVERE' ? "bg-error/20 text-error" : 
                        interaction.severity === 'MODERATE' ? "bg-tertiary/20 text-tertiary" :
                        "bg-surface-variant text-on-surface-variant"
                      )}>
                        {interaction.severity}
                      </span>
                    </div>
                    <p className="text-on-surface-variant/80 leading-relaxed mb-4">{interaction.clinicalFinding}</p>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-on-surface-variant/50">
              <p>No severe or moderate interactions found for this medication.</p>
            </div>
          )}

          {drug.foodInteractions && drug.foodInteractions.length > 0 && (
            <div className="mt-12">
              <header className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center border border-glass-border">
                  <Utensils className="text-warning" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-on-surface">Food & Substance Interactions</h2>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...drug.foodInteractions]
                  .sort((a, b) => {
                    const order: Record<string, number> = { 'SEVERE': 0, 'MODERATE': 1, 'MILD': 2 };
                    return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
                  })
                  .map((interaction, idx) => (
                  <div key={`food-${idx}`} className="p-6 bg-glass rounded-3xl border border-glass-border flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-on-surface">{interaction.foodOrSubstance}</h3>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          interaction.severity === 'SEVERE' ? "bg-error/20 text-error" : 
                          interaction.severity === 'MODERATE' ? "bg-tertiary/20 text-tertiary" :
                          "bg-surface-variant text-on-surface-variant"
                        )}>
                          {interaction.severity}
                        </span>
                      </div>
                      <p className="text-on-surface-variant/80 leading-relaxed mb-4">{interaction.clinicalFinding}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
