import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = {
  dark: { name: 'dark', label: 'Midnight', icon: '🌙' },
  champagne: { name: 'champagne', label: 'Champagne', icon: '🥂' },
  burgundy: { name: 'burgundy', label: 'Burgundy', icon: '🍷' },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('splendur-theme') || 'dark';
    // Set immediately so CSS vars are available on first render
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  });

  useEffect(() => {
    localStorage.setItem('splendur-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  // Fallback if used outside provider
  return ctx || { theme: 'dark', setTheme: () => {}, themes: THEMES };
}

export { THEMES };
