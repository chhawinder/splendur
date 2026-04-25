import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = {
  dark: { name: 'dark', label: 'Midnight', icon: '🌙' },
  champagne: { name: 'champagne', label: 'Champagne', icon: '🥂' },
  burgundy: { name: 'burgundy', label: 'Burgundy', icon: '🍷' },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('splendur-theme') || 'dark';
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
  return useContext(ThemeContext);
}

export { THEMES };
