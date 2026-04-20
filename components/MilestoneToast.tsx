'use client';

import { useEffect, useRef } from 'react';

export type MilestoneToast = {
  id: string;
  emoji: string;
  title: string;
  message: string;
};

const SEEN_KEY = 'greenstep_milestones_seen';

const MILESTONES = [
  {
    threshold: 1,
    emoji: '🌱',
    title: '1 kg saved!',
    message: 'You\'ve avoided 1 kg CO₂e — like skipping 6.7 km of driving.',
  },
  {
    threshold: 5,
    emoji: '🌿',
    title: '5 kg saved!',
    message: 'That\'s equivalent to 33 km not driven. Keep going!',
  },
  {
    threshold: 10,
    emoji: '🌳',
    title: '10 kg saved!',
    message: 'Roughly a tree\'s monthly carbon absorption. You\'re making a real dent.',
  },
  {
    threshold: 25,
    emoji: '🌍',
    title: '25 kg saved!',
    message: 'Equivalent to avoiding a short regional flight. Incredible.',
  },
  {
    threshold: 50,
    emoji: '⚡',
    title: '50 kg saved!',
    message: 'The impact of powering a home for nearly a week without emissions.',
  },
];

function getSeenThresholds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as number[];
  } catch {
    return [];
  }
}

export function checkMilestones(prev: number, next: number): MilestoneToast[] {
  const seen = getSeenThresholds();
  const triggered: MilestoneToast[] = [];
  for (const m of MILESTONES) {
    if (m.threshold > prev && m.threshold <= next && !seen.includes(m.threshold)) {
      triggered.push({ id: crypto.randomUUID(), ...m });
      seen.push(m.threshold);
    }
  }
  if (triggered.length) {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
  return triggered;
}

export function MilestoneToastStack({ toasts, onDismiss }: {
  toasts: MilestoneToast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3" aria-live="polite">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: MilestoneToast; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, onDismiss]);

  return (
    <div className="flex w-72 items-start gap-3 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xl shadow-emerald-900/10 dark:border-emerald-800/50 dark:bg-stone-900 sm:w-80">
      <span className="text-2xl" aria-hidden>{toast.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">{toast.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-stone-300 transition hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
