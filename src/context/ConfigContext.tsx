import React, { createContext, useContext, useState, useEffect } from 'react';

export const LANGUAGES = [
  { code: 'en', name: 'English', shortName: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)', shortName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali (বাংলা)', shortName: 'বাংলা' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', shortName: 'ଓଡ଼ିଆ' }
];

export type AppConfig = {
  language: string;
};

interface ConfigContextType {
  config: AppConfig;
  setLanguage: (lang: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('pharma_app_config');
      return saved ? JSON.parse(saved) : { language: 'en' };
    } catch {
      return { language: 'en' };
    }
  });

  useEffect(() => {
    localStorage.setItem('pharma_app_config', JSON.stringify(config));
  }, [config]);

  const setLanguage = (language: string) => setConfig(prev => ({ ...prev, language }));

  return (
    <ConfigContext.Provider value={{ config, setLanguage }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useAppConfig must be used within a ConfigProvider');
  return context;
};
