"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type ThemeContextType = {
  currentTheme: string;
  changeCurrentTheme: (newTheme: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'light',
  changeCurrentTheme: () => {},
});

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('theme')) || 'light';
    setTheme(saved);
    setMounted(true);
  }, []);

  const changeCurrentTheme = (newTheme: string) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.add('**:transition-none!');
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }

    const transitionTimeout = setTimeout(() => {
      document.documentElement.classList.remove('**:transition-none!');
    }, 1);
    
    return () => clearTimeout(transitionTimeout);
  }, [theme, mounted]);

  return <ThemeContext.Provider value={{ currentTheme: theme, changeCurrentTheme }}>{children}</ThemeContext.Provider>;
}

export const useThemeProvider = () => useContext(ThemeContext);