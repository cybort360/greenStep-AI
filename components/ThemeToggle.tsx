'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <div className="fixed right-4 top-4 z-40 flex items-center gap-0.5 rounded-full border border-stone-200/70 bg-white/90 p-1 shadow-lg shadow-stone-900/10 backdrop-blur dark:border-stone-700/60 dark:bg-stone-900/90 dark:shadow-black/30 sm:right-5 sm:top-5">
      <button
        onClick={() => theme === 'dark' && toggle()}
        aria-label="Switch to light mode"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          theme === 'light'
            ? 'bg-amber-100 text-amber-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-300'
        }`}
      >
        <Sun className="size-4" />
      </button>
      <button
        onClick={() => theme === 'light' && toggle()}
        aria-label="Switch to dark mode"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-stone-700 text-indigo-300 shadow-sm'
            : 'text-stone-400 hover:text-stone-600'
        }`}
      >
        <Moon className="size-3.5" />
      </button>
    </div>
  );
}
