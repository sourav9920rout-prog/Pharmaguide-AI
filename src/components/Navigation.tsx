import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ArrowLeftRight, History as HistoryIcon, Pill, Sun, Moon, Zap, CheckCircle2, User, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { UserProfileModal } from './UserProfileModal';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAppConfig, LANGUAGES } from '../context/ConfigContext';
import { useTranslation } from '../translations';
import { useBackgroundSync } from '../context/BackgroundSyncContext';

function SyncButton() {
  const { isSyncing, cooldownRemaining, isPaused, openWidget } = useBackgroundSync();

  return (
    <button
      onClick={openWidget}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all border border-glass-border",
        isSyncing 
          ? "bg-primary/15 text-primary border-primary/30" 
          : "bg-glass text-on-surface-variant hover:text-on-surface hover:bg-white/10"
      )}
      title="Open Background Sync Engine"
    >
      <Database size={15} className={isSyncing && !isPaused ? "text-primary animate-pulse" : ""} />
      <span className="hidden lg:inline">
        {isSyncing ? (cooldownRemaining > 0 ? `Sync (${cooldownRemaining}s)` : "Syncing...") : "Sync DB"}
      </span>
    </button>
  );
}

function ApiButton() {
  const [hasApi, setHasApi] = useState(false);

  useEffect(() => {
    const checkApi = () => {
      setHasApi(!!localStorage.getItem('user_gemini_api_key'));
    };
    checkApi();
    window.addEventListener('storage', checkApi);
    // Custom event for when API is updated in settings within the same window
    window.addEventListener('api-key-updated', checkApi);
    return () => {
      window.removeEventListener('storage', checkApi);
      window.removeEventListener('api-key-updated', checkApi);
    };
  }, []);

  return (
    <Link 
      to="/settings" 
      className={cn(
        "relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm",
        hasApi ? "bg-green-500 hover:bg-green-600" : "bg-[#574edd] hover:brightness-110"
      )}
    >
      {hasApi ? <CheckCircle2 size={16} /> : <Zap size={16} />}
      <span className="hidden md:block">{hasApi ? "API IS ADDED" : "Add API"}</span>
      {!hasApi && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-1 -right-1"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        </motion.div>
      )}
    </Link>
  );
}

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { profile } = useUserProfile();
  const { config, setLanguage, setMode } = useAppConfig();
  const { t } = useTranslation(config.language);

  return (
    <>
      <header className="sticky top-0 z-50 glass-nav border-b">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Pill className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-on-surface hidden sm:block">PharmaGuide AI</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/" icon={<Search size={18} />} label={t("search")} />
            <NavLink to="/interactions" icon={<ArrowLeftRight size={18} />} label={t("interactions")} />
            <NavLink to="/history" icon={<HistoryIcon size={18} />} label={t("history")} />
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-glass border border-glass-border rounded-xl px-2 py-1 shadow-sm relative">
              <select 
                value={config.language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold text-on-surface focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4 z-10 w-auto outline-none"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-surface text-on-surface">
                    {lang.shortName}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className={cn(
                "p-2.5 rounded-full border border-glass-border transition-all relative",
                profile ? "bg-primary/10 text-primary border-primary/20" : "bg-glass text-on-surface-variant hover:text-on-surface hover:bg-white/10"
              )}
              title="Personalize Results"
            >
              <User size={20} />
              {profile && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-surface rounded-full"></span>
              )}
            </button>
            <button 
              onClick={toggleTheme}
              className="p-2.5 bg-glass rounded-full border border-glass-border text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all hidden sm:block"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <SyncButton />
            <ApiButton />
          </div>
        </div>
      </header>
      
      {/* Mobile top config bar if needed, or we just put the language select in the bottom nav? Let's just keep language in the header, visible on all screens maybe, or we create a settings page. Let's make it visible on mobile in the header. */}
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
        isActive 
          ? "bg-primary/10 text-primary shadow-inner" 
          : "text-on-surface-variant hover:text-on-surface hover:bg-glass"
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const { config } = useAppConfig();
  const { t } = useTranslation(config.language);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 glass-nav border-t rounded-t-3xl shadow-ambient">
      <MobileNavLink to="/" icon={<Search size={20} />} label={t("search")} />
      <MobileNavLink to="/interactions" icon={<ArrowLeftRight size={20} />} label={t("interactions")} />
      <MobileNavLink to="/history" icon={<HistoryIcon size={20} />} label={t("history")} />
    </nav>
  );
}

function MobileNavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition-all duration-200",
        isActive 
          ? "bg-primary/10 text-primary scale-110" 
          : "text-on-surface-variant"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter mt-1">{label}</span>
    </Link>
  );
}

export function Footer() {
  const { theme } = useTheme();
  const { config } = useAppConfig();
  const { t } = useTranslation(config.language);

  return (
    <footer className="w-full px-8 py-6 mb-20 bg-surface-dim border-t border-outline-variant/10">
      <div className="max-w-7xl mx-auto text-center space-y-2">
        <p className={cn(
          "text-[13px] text-[#ff0026] leading-tight font-sans max-w-2xl mx-auto transition-colors duration-300",
          theme === 'dark' && "animate-pulse"
        )}>
          {t("disclaimer")}
        </p>
        <p className={cn(
          "text-[12px] font-sans",
          theme === 'dark' ? "text-white" : "text-[#0302a0]"
        )}>
          PharmaGuide AI Copyright. 2026. Made By Sourav
        </p>
      </div>
    </footer>
  );
}
