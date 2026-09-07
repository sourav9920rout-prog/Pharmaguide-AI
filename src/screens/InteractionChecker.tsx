import React, { useState, useEffect } from 'react';
import { Search, ArrowLeftRight, Info, AlertTriangle, ShieldCheck, ClipboardList, ArrowRight, X, Activity, Loader2, CheckCircle2, Plus, RefreshCw, Brain, Clock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { checkInteractions } from '../services/geminiService';
import { getFromCache } from '../services/historyService';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { DrugInput } from '../components/DrugInput';

interface InteractionResult {
  hasInteraction: boolean;
  severity: 'SEVERE' | 'MODERATE' | 'MINOR' | 'NONE';
  clinicalFinding: string;
  explanation: string;
  monitoring: { label: string; description: string }[];
}

export default function InteractionChecker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q');
  const initialDrugs = initialQuery ? initialQuery.split(',').map(d => d.trim()) : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(initialDrugs);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDrugs, setPendingDrugs] = useState<string[]>([]);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    if (initialQuery && initialDrugs.length >= 2) {
      handleAnalyze(initialDrugs, false);
    }
  }, [initialQuery]);

  const addDrug = () => {
    if (!searchQuery.trim()) return;
    if (selectedDrugs.includes(searchQuery.trim())) return;
    setSelectedDrugs([...selectedDrugs, searchQuery.trim()]);
    setSearchQuery('');
  };

  const removeDrug = (drug: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d !== drug));
  };

  const handleAnalyze = async (drugsToCheck = selectedDrugs, forceRegenerate = false) => {
    if (drugsToCheck.length < 2) {
      setError("Please add at least two medications to check for interactions.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await checkInteractions(drugsToCheck, forceRegenerate);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const onAnalyzeClick = () => {
    handleAnalyze(selectedDrugs, false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      {/* Left Column: Input & Selection */}
      <section className="lg:col-span-5 flex flex-col gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-8"
        >
          <nav className="mb-6">
            <button onClick={handleBack} className="flex items-center gap-2 text-secondary font-bold hover:opacity-80 transition-opacity group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Back</span>
            </button>
          </nav>
          <div className="mb-8">
            <span className="text-[10px] tracking-widest uppercase font-bold text-secondary mb-2 block">Safety Tool</span>
            <h2 className="text-3xl font-extrabold text-on-surface leading-tight">Interaction Checker</h2>
            <p className="text-on-surface-variant/40 mt-2 text-sm leading-relaxed">
              Identify potentially harmful drug combinations. Add medications to your list to analyze risk profiles instantly.
            </p>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <label className="block text-[11px] font-bold text-on-surface-variant/30 uppercase mb-2 ml-1">Search Medication</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant/40 z-10 w-6">
                  <Search size={20} />
                </div>
                <DrugInput 
                  className="w-full pl-12 pr-14 py-4 glass-input outline-none" 
                  placeholder="e.g. Warfarin, Aspirin, Metformin..." 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onEnter={addDrug}
                />
                <button 
                  onClick={addDrug}
                  disabled={!searchQuery.trim()}
                  className="absolute inset-y-2 right-2 flex items-center justify-center w-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-primary/10 z-10"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedDrugs.map(drug => (
                <div key={drug} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-full text-sm font-medium transition-all hover:brightness-110 border border-white/10">
                  {drug}
                  <button 
                    onClick={() => removeDrug(drug)}
                    className="ml-2 hover:opacity-70 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-error text-xs flex items-center gap-2">
                <AlertTriangle size={14} />
                {error}
              </p>
            )}

            <button 
              onClick={onAnalyzeClick}
              disabled={loading || selectedDrugs.length < 2}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Activity size={20} />}
              {loading ? 'Analyzing...' : 'Analyze Interactions'}
            </button>
            {result && selectedDrugs.length >= 2 && (
              <button 
                onClick={() => handleAnalyze(selectedDrugs, true)}
                disabled={loading}
                className="w-full py-3 bg-glass border border-glass-border text-primary font-bold rounded-xl shadow-ambient hover:bg-glass/80 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <RefreshCw size={18} className={loading && result ? "animate-spin" : ""} />
                Research Again
              </button>
            )}
          </div>
        </motion.div>

        <div className="bg-glass border border-glass-border p-6 rounded-2xl flex gap-4 shadow-ambient">
          <Info className="text-secondary shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-on-surface text-sm">Curator's Note</h4>
            <p className="text-on-surface-variant/40 text-xs leading-relaxed mt-1">
              For more accurate results, include over-the-counter supplements and herbal remedies which often have documented interactions. Although broad interaction summaries may suggest limited concern, deeper pharmacological evaluation and context-specific evidence may classify the interaction as moderate under certain clinical conditions.
            </p>
          </div>
        </div>
      </section>

      {/* Right Column: Results */}
      <section className="lg:col-span-7">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card overflow-hidden min-h-[600px] flex flex-col"
        >
          <AnimatePresence mode="wait">
            {!result && !loading ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex flex-col items-center justify-center p-12 text-center space-y-4"
              >
                <div className="w-20 h-20 bg-glass rounded-full flex items-center justify-center border border-glass-border">
                  <ArrowLeftRight className="text-on-surface-variant/20" size={40} />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-xl font-bold text-on-surface">Ready to Analyze</h3>
                  <p className="text-on-surface-variant/40 text-sm mt-2">Add at least two medications and click analyze to see potential risks.</p>
                </div>
              </motion.div>
            ) : loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex flex-col items-center justify-center p-12 text-center space-y-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="text-primary animate-pulse" size={32} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-on-surface">Clinical Analysis in Progress</h3>
                  <p className="text-on-surface-variant/40 text-sm">Consulting medical databases and AI models...</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col"
              >
                <div className="p-8 pb-4 border-b border-glass-border bg-glass backdrop-blur-md sticky top-0 flex justify-between items-end z-10">
                  <div>
                    <h3 className="text-2xl font-bold text-on-surface">Analysis Results</h3>
                    <p className="text-on-surface-variant/40 text-sm mt-1">
                      {result.hasInteraction 
                        ? `Found a ${result.severity.toLowerCase()} interaction.` 
                        : "No significant interactions found."}
                    </p>
                  </div>
                  {result.hasInteraction && (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                      result.severity === 'SEVERE' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                      result.severity === 'MODERATE' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                      "bg-blue-500/10 border-blue-500/20 text-blue-500"
                    )}>
                      <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        result.severity === 'SEVERE' ? "bg-red-500" :
                        result.severity === 'MODERATE' ? "bg-yellow-500" :
                        "bg-blue-500"
                      )}></span>
                      <span className="font-bold text-[10px] tracking-widest uppercase">{result.severity} Alert</span>
                    </div>
                  )}
                </div>

                <div className="p-8 space-y-6">
                  {result.hasInteraction ? (
                    <div className="relative group">
                      <div className={cn(
                        "absolute -inset-1 opacity-10 rounded-3xl group-hover:opacity-15 transition-opacity",
                        result.severity === 'SEVERE' ? "bg-red-500" : 
                        result.severity === 'MODERATE' ? "bg-yellow-500" : "bg-blue-500"
                      )}></div>
                      <div className="relative bg-glass p-8 rounded-3xl border border-glass-border">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center border",
                              result.severity === 'SEVERE' ? "bg-red-500/20 text-red-500 border-red-500/30" : 
                              result.severity === 'MODERATE' ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" :
                              "bg-blue-500/20 text-blue-500 border-blue-500/30"
                            )}>
                              <AlertTriangle size={32} />
                            </div>
                            <div>
                              <div className={cn(
                                "flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider",
                                result.severity === 'SEVERE' ? "text-red-500" : 
                                result.severity === 'MODERATE' ? "text-yellow-500" : "text-blue-500"
                              )}>
                                <span>{result.severity} Interaction</span>
                              </div>
                              <h4 className="text-xl font-bold text-on-surface">{selectedDrugs.join(' + ')}</h4>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 bg-glass rounded-xl border border-glass-border">
                            <h5 className="text-[10px] font-bold text-on-surface-variant/30 uppercase mb-2">Clinical Finding</h5>
                            <p className="text-on-surface font-semibold text-lg">{result.clinicalFinding}</p>
                          </div>
                          
                          <div>
                            <h5 className="text-[10px] font-bold text-on-surface-variant/30 uppercase mb-3 ml-1">Simple Explanation</h5>
                            <div className="bg-glass border-l-4 border-primary p-5 rounded-r-xl">
                              <p className="text-on-surface-variant/60 leading-relaxed text-sm">
                                {result.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                        <ShieldCheck size={32} />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-on-surface">Safe Combination</h4>
                        <p className="text-on-surface-variant/60 text-sm mt-2">
                          No major interactions were found between these medications. However, always consult with your doctor as individual factors may vary.
                        </p>
                      </div>
                    </div>
                  )}

                  {result.monitoring && result.monitoring.length > 0 && (
                    <div className="bg-glass p-8 rounded-3xl border border-glass-border">
                      <h5 className="text-[10px] font-bold text-on-surface-variant/30 uppercase mb-6 tracking-widest">Recommended Monitoring</h5>
                      <div className="relative pl-8 border-l-2 border-glass-border space-y-8">
                        {result.monitoring.map((item, idx) => (
                          <div key={idx} className="relative">
                            <div className={cn(
                              "absolute -left-[41px] top-0 w-4 h-4 rounded-full ring-4 ring-surface",
                              "bg-secondary"
                            )}></div>
                            <h6 className="font-bold text-on-surface text-sm">{item.label}</h6>
                            <p className="text-on-surface-variant/40 text-xs mt-1">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
}
