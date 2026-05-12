import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Читаем сохранённое значение
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) return saved;
    // Или берём системные настройки
    return window.matchMedia('(prefers-color-scheme: light)')
      .matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme', theme
    );
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () =>
    setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggle };
}
