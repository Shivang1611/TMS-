import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DarkModeContext = createContext(null);

const STORAGE_KEY = 'tms_darkMode';

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync `.dark` class on <html> and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, dark.toString());
  }, [dark]);

  // Listen for system preference changes (only if user hasn't set a preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        setDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = useCallback(() => setDark((d) => !d), []);
  const enable = useCallback(() => setDark(true), []);
  const disable = useCallback(() => setDark(false), []);

  return (
    <DarkModeContext.Provider value={{ dark, toggle, enable, disable }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error('useDarkMode must be used within DarkModeProvider');
  return ctx;
}
