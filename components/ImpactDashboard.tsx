'use client';

import { Car, Leaf, Sparkles, Utensils } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EarthDayBanner } from './EarthDayBanner';
import { type MilestoneToast, MilestoneToastStack, checkMilestones } from './MilestoneToast';
import { type HistoryEntry, ProgressChart, appendHistory, readHistory } from './ProgressChart';

const THREAD_KEY = 'greenstep_thread_id';
const STREAK_KEY = 'greenstep_streak_count';
const LAST_DAY_KEY = 'greenstep_last_log_day';
const LOG_COUNT_KEY = 'greenstep_log_count';

const CHIPS = [
  'Took the bus',
  'Plant-based lunch',
  'Skipped the dryer',
  'Walked instead of driving',
  'Turned off lights',
];

type CoachPayload = {
  impact_score: number;
  insight: string;
  challenge: string;
  recommendation: string;
  total_saved: number;
};

type UiError = {
  message: string;
  helpUrl?: string;
  retryAfterSeconds?: number;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readStreakAfterLog(): number {
  if (typeof window === 'undefined') return 0;
  const today = todayKey();
  const last = window.localStorage.getItem(LAST_DAY_KEY);
  const prev = Number(window.localStorage.getItem(STREAK_KEY) || '0');
  let next = 1;
  if (last === today) next = prev > 0 ? prev : 1;
  else if (last === yesterdayKey()) next = prev > 0 ? prev + 1 : 1;
  window.localStorage.setItem(STREAK_KEY, String(next));
  window.localStorage.setItem(LAST_DAY_KEY, today);
  return next;
}

function co2Equivalency(kg: number): string {
  if (kg <= 0) return '';
  const km = kg / 0.15;
  if (km < 1) return `≈ ${Math.round(km * 1000)} m of driving avoided`;
  return `≈ ${km.toFixed(1)} km not driven`;
}

export function ImpactDashboard() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadReady, setThreadReady] = useState(false);
  const [showThreadId, setShowThreadId] = useState(false);
  const [logText, setLogText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [coach, setCoach] = useState<CoachPayload | null>(null);
  const [echoNote, setEchoNote] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [logCount, setLogCount] = useState(0);
  const [toasts, setToasts] = useState<MilestoneToast[]>([]);
  const prevTotalRef = useRef(0);

  useEffect(() => {
    const existing = window.localStorage.getItem(THREAD_KEY);
    if (existing) {
      setThreadId(existing);
      setThreadReady(true);
      setStreak(Number(window.localStorage.getItem(STREAK_KEY) || '0'));
      setHistory(readHistory());
      setLogCount(Number(window.localStorage.getItem(LOG_COUNT_KEY) || '0'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/thread', { method: 'POST' });
        const data = (await res.json()) as { threadId?: string; error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not start session.');
        if (!data.threadId) throw new Error('Missing thread id.');
        if (cancelled) return;
        window.localStorage.setItem(THREAD_KEY, data.threadId);
        setThreadId(data.threadId);
        setThreadReady(true);
        setHistory(readHistory());
        setLogCount(Number(window.localStorage.getItem(LOG_COUNT_KEY) || '0'));
      } catch (e) {
        if (!cancelled) setError({ message: e instanceof Error ? e.message : 'Could not start session.' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!threadId || !logText.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId, message: logText.trim() }),
        });
        const data = (await res.json()) as {
          coach?: CoachPayload;
          echoNote?: string;
          error?: string;
          helpUrl?: string;
          retryAfterSeconds?: number;
        };
        if (!res.ok) {
          setError({ message: data.error || 'Request failed.', helpUrl: data.helpUrl, retryAfterSeconds: data.retryAfterSeconds });
          return;
        }
        if (!data.coach) throw new Error('Invalid response from coach.');

        // Update history
        const newHistory = appendHistory(data.coach.impact_score);
        setHistory(newHistory);

        // Update log count
        const newCount = Number(window.localStorage.getItem(LOG_COUNT_KEY) || '0') + 1;
        window.localStorage.setItem(LOG_COUNT_KEY, String(newCount));
        setLogCount(newCount);

        // Check milestones
        const newToasts = checkMilestones(prevTotalRef.current, data.coach.total_saved);
        prevTotalRef.current = data.coach.total_saved;
        if (newToasts.length) setToasts(prev => [...prev, ...newToasts]);

        setCoach(data.coach);
        setEchoNote(data.echoNote ?? null);
        setLogText('');
        setStreak(readStreakAfterLog());
      } catch (err) {
        setError({ message: err instanceof Error ? err.message : 'Something went wrong.' });
      } finally {
        setLoading(false);
      }
    },
    [threadId, logText],
  );

  // Thread stats derived from history
  const activeDays = new Set(history.map(e => e.date)).size;

  return (
    <>
      <MilestoneToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="flex w-full flex-1 flex-col gap-6 sm:gap-10">

        {/* ── Earth Day banner ── */}
        <EarthDayBanner />

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/70 px-3 py-1 text-2xl font-medium uppercase tracking-widest text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-800/50 dark:bg-stone-800/70 dark:text-emerald-300"
              style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              <Leaf className="size-5.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              GreenStep AI
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base dark:text-stone-400">
              Log the small choices you make each day. Your thread stays alive
              across refreshes so the coach remembers your journey.
            </p>
          </div>

          {/* Session status */}
          <div className="rounded-2xl border border-stone-200/80 bg-white/60 px-4 py-3 text-sm shadow-sm backdrop-blur sm:text-right dark:border-stone-700/80 dark:bg-stone-800/60">
            <div className="flex items-center gap-2 sm:justify-end">
              <span className={`h-2 w-2 shrink-0 rounded-full ${threadReady ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'}`} aria-hidden />
              <p className="font-medium text-stone-700 dark:text-stone-200">
                {threadReady ? 'Session active' : 'Starting session…'}
              </p>
              {threadReady && (
                <button
                  onClick={() => setShowThreadId(s => !s)}
                  className="text-xs text-stone-400 transition hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                >
                  {showThreadId ? 'hide' : 'show id'}
                </button>
              )}
            </div>
            {showThreadId && threadId && (
              <p className="mt-1 break-all font-mono text-xs text-stone-500 dark:text-stone-400">{threadId}</p>
            )}
            {/* Thread stats */}
            {logCount > 0 && (
              <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-500 sm:text-right">
                Olive has kept up with{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{logCount} log{logCount !== 1 ? 's' : ''}</span>
                {' '}across{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{activeDays} day{activeDays !== 1 ? 's' : ''}</span>
              </p>
            )}
          </div>
        </header>

        {/* ── Error banner ── */}
        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-300"
            role="alert"
          >
            <p>{error.message}</p>
            {error.retryAfterSeconds != null && (
              <p className="mt-2 text-xs text-red-700/90 dark:text-red-400/90">
                Suggested wait: ~{error.retryAfterSeconds}s before retrying.
              </p>
            )}
            {error.helpUrl && (
              <p className="mt-2 break-all">
                <a
                  href={error.helpUrl}
                  className="font-medium text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800 dark:text-red-200 dark:decoration-red-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {error.helpUrl.includes('/billing')
                    ? 'Gemini API billing & enabling usage'
                    : error.helpUrl.includes('rate-limit')
                      ? 'Gemini API rate limits & quotas'
                      : 'Open Google Cloud: enable Generative Language API'}
                </a>
              </p>
            )}
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid flex-1 gap-6 lg:grid-cols-12 lg:gap-8">

          {/* Log form */}
          <section className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--gs-forest)]">The Log</h2>
              <div className="flex gap-2 text-emerald-700/80 dark:text-emerald-500/80" aria-hidden>
                <span title="Transport"><Car className="size-5" /></span>
                <span title="Food"><Utensils className="size-5" /></span>
                <span title="Nature"><Leaf className="size-5" /></span>
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="flex flex-1 flex-col rounded-3xl border border-stone-200/90 bg-white/75 p-5 shadow-md shadow-emerald-900/5 backdrop-blur sm:p-6 dark:border-stone-700/80 dark:bg-stone-900/75 dark:shadow-none"
            >
              <label htmlFor="activity-log" className="sr-only">Activity log</label>
              <textarea
                id="activity-log"
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                rows={6}
                disabled={!threadReady || loading}
                placeholder='Try: "I took the bus 10 km instead of driving" or "Lunch was a plant-based bowl."'
                className="min-h-[140px] flex-1 resize-y rounded-2xl border border-stone-200/90 bg-stone-50/80 px-4 py-3 text-base text-stone-800 outline-none ring-emerald-500/30 transition placeholder:text-stone-400 focus:border-emerald-300 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700/80 dark:bg-stone-800/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-emerald-700 dark:focus:bg-stone-800"
              />

              {/* Quick chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {CHIPS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLogText(t => t.trim() ? `${t.trim()} — ${chip.toLowerCase()}` : chip)}
                    disabled={!threadReady || loading}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                    ✦ Powered by Gemini
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                    ⬡ Memory by Backboard
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={!threadReady || loading || !logText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gs-moss)] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:bg-[var(--gs-forest)] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none dark:disabled:bg-stone-700"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" aria-hidden />
                      Update impact
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Impact card */}
          <aside className="flex flex-col gap-4 lg:col-span-5">
            <h2 className="text-lg font-semibold text-[var(--gs-forest)]">Impact card</h2>
            <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-white/90 to-emerald-50/50 p-6 shadow-lg shadow-emerald-900/10 backdrop-blur dark:border-emerald-800/50 dark:from-stone-900/90 dark:to-emerald-950/20 dark:shadow-none">

              {/* Total + streak */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80 dark:text-emerald-400/80">
                    Total CO₂e avoided (est.)
                  </p>
                  <p
                    className="mt-1 text-4xl font-semibold text-[var(--gs-forest)] sm:text-5xl"
                    style={{ fontFamily: 'var(--font-fraunces), serif' }}
                  >
                    {coach ? coach.total_saved.toFixed(2) : '—'}
                    <span className="ml-1 text-xl font-medium text-emerald-800/90 sm:text-2xl dark:text-emerald-300/90">
                      kg
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-center shadow-inner dark:border-amber-800/50 dark:bg-amber-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80 dark:text-amber-300/80">Streak</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{streak > 0 ? streak : '—'}</p>
                  <p className="text-[10px] text-amber-900/70 dark:text-amber-400/70">days logging</p>
                </div>
              </div>

              {/* This entry + Coach note */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm dark:border-stone-700/80 dark:bg-stone-800/60">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">This entry</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-800 dark:text-emerald-300">
                    {coach && coach.impact_score > 0 ? `${coach.impact_score.toFixed(2)} kg` : '—'}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">CO₂e (rough)</p>
                  {coach && coach.impact_score > 0 && (
                    <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {co2Equivalency(coach.impact_score)}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm sm:col-span-2 dark:border-stone-700/80 dark:bg-stone-800/60">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">Coach note</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {coach?.insight ?? 'Your insight will appear after your first log.'}
                  </p>
                </div>
              </div>

              {/* Progress chart */}
              <ProgressChart history={history} />

              {/* Recommendation */}
              <div className="mt-auto rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/80 dark:text-violet-300/80">Recommendation</p>
                <p className="mt-2 text-sm font-medium text-violet-950 dark:text-violet-200">
                  {coach?.recommendation ?? 'Log an action to receive a personalised recommendation.'}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Next challenge ── */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4 shadow-sm sm:px-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80 dark:text-emerald-400/80">Next challenge</p>
          <p className="mt-2 text-sm font-medium text-emerald-950 dark:text-emerald-200">
            {coach?.challenge ?? 'Log an action to receive a tailored micro-challenge.'}
          </p>
        </div>

        {/* ── Echo Effect ── */}
        <footer className="mt-auto rounded-2xl border border-stone-200/80 bg-[var(--gs-sand)]/80 px-4 py-4 text-sm shadow-inner backdrop-blur sm:px-6 dark:border-stone-700/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">The Echo Effect</p>
          <p className="mt-2 leading-relaxed text-stone-700 dark:text-stone-300">
            {echoNote ?? 'Each time you ask for coaching, we will estimate the carbon footprint of that AI call here using Gemini.'}
          </p>
        </footer>

      </div>
    </>
  );
}
