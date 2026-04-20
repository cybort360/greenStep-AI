'use client';

import { Leaf, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'greenstep_earthday_dismissed';

export function EarthDayBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === '1') setDismissed(true);
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-4 shadow-lg dark:border-emerald-700/60 dark:from-emerald-800 dark:to-teal-700">
      {/* Decorative rings */}
      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-white/10" />

      <div className="relative flex items-center gap-4">
        <span className="text-3xl" aria-hidden>🌍</span>
        <div className="flex-1">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/90">
            <Leaf className="size-3.5" aria-hidden />
            Happy Earth Day
          </p>
          <p className="mt-0.5 text-sm leading-snug text-white/80">
            April 22 — every small choice adds up. You&apos;re already making a difference.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss Earth Day banner"
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
