import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppLanguage, getSavedLanguage, saveLanguage, t as translateFn } from '../lib/translations';

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'km',
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => getSavedLanguage());

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  useEffect(() => {
    const handleEvent = (e: any) => {
      if (e?.detail && (e.detail === 'km' || e.detail === 'en')) {
        setLanguageState(e.detail);
      }
    };
    window.addEventListener('app-language-changed', handleEvent);
    return () => {
      window.removeEventListener('app-language-changed', handleEvent);
    };
  }, []);

  const t = (key: string, defaultText?: string): string => {
    return translateFn(key, language) || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
