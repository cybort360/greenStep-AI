'use client';

import { Car, Leaf, Sparkles, Utensils } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const THREAD_KEY = 'greenstep_thread_id';
const STREAK_KEY = 'greenstep_streak_count';
const LAST_DAY_KEY = 'greenstep_last_log_day';

type CoachPayload = {
  impact_score: number;
  insight: string;
  challenge: string;
  total_saved: number;
};

type UiError = {
  message: string;
  helpUrl?: string;
  retryAfterSeconds?: number;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readStreakAfterLog(): number {
  if (typeof window === 'undefined') return 0;
  const today = todayKey();
  const last = window.localStorage.getItem(LAST_DAY_KEY);
  const prevStreak = Number(window.localStorage.getItem(STREAK_KEY) || '0');

  let next = 1;
  if (last === today) {
    next = prevStreak > 0 ? prevStreak : 1;
  } else if (last === yesterdayKey()) {
    next = prevStreak > 0 ? prevStreak + 1 : 1;
  } else if (last) {
    next = 1;
  }

  window.localStorage.setItem(STREAK_KEY, String(next));
  window.localStorage.setItem(LAST_DAY_KEY, today);
  return next;
}

export function ImpactDashboard() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadReady, setThreadReady] = useState(false);
  const [logText, setLogText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const [coach, setCoach] = useState<CoachPayload | null>(null);
  const [echoNote, setEchoNote] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const existing = window.localStorage.getItem(THREAD_KEY);
    if (existing) {
      setThreadId(existing);
      setThreadReady(true);
      const s = Number(window.localStorage.getItem(STREAK_KEY) || '0');
      setStreak(s > 0 ? s : 0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/thread', { method: 'POST' });
        const data = (await res.json()) as {
          threadId?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'Could not start session.');
        if (!data.threadId) throw new Error('Missing thread id.');
        if (cancelled) return;
        window.localStorage.setItem(THREAD_KEY, data.threadId);
        setThreadId(data.threadId);
        setThreadReady(true);
      } catch (e) {
        if (!cancelled) {
          setError({
            message:
              e instanceof Error ? e.message : 'Could not start session.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
          setError({
            message: data.error || 'Request failed.',
            helpUrl: data.helpUrl,
            retryAfterSeconds: data.retryAfterSeconds,
          });
          return;
        }
        if (!data.coach) throw new Error('Invalid response from coach.');
        setCoach(data.coach);
        setEchoNote(data.echoNote ?? null);
        setLogText('');
        setStreak(readStreakAfterLog());
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Something went wrong.',
        });
      } finally {
        setLoading(false);
      }
    },
    [threadId, logText],
  );

  return (
    <div className="flex w-full flex-1 flex-col gap-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/70 px-3 py-1 text-2xl font-medium uppercase tracking-widest text-emerald-800 shadow-sm backdrop-blur"
            style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            <Leaf className="size-5.5 text-emerald-600" aria-hidden />
            GreenStep AI
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Log the small choices you make each day. Your thread stays alive
            across refreshes so the coach remembers your journey.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200/80 bg-white/60 px-4 py-3 text-sm text-stone-600 shadow-sm backdrop-blur sm:text-right">
          <p className="font-medium text-stone-700">Thread memory</p>
          <p className="mt-1 break-all font-mono text-xs text-stone-500">
            {threadReady && threadId ? threadId : 'Preparing…'}
          </p>
        </div>
      </header>

      {error && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm"
          role="alert"
        >
          <p>{error.message}</p>
          {error.retryAfterSeconds != null ? (
            <p className="mt-2 text-xs text-red-700/90">
              Suggested wait: ~{error.retryAfterSeconds}s before retrying.
            </p>
          ) : null}
          {error.helpUrl ? (
            <p className="mt-2 break-all">
              <a
                href={error.helpUrl}
                className="font-medium text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800"
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
          ) : null}
        </div>
      )}

      <div className="grid flex-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <section className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--gs-forest)]">
              The Log
            </h2>
            <div className="flex gap-2 text-emerald-700/80" aria-hidden>
              <span title="Transport">
                <Car className="size-5" />
              </span>
              <span title="Food">
                <Utensils className="size-5" />
              </span>
              <span title="Nature">
                <Leaf className="size-5" />
              </span>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex flex-1 flex-col rounded-3xl border border-stone-200/90 bg-white/75 p-5 shadow-md shadow-emerald-900/5 backdrop-blur sm:p-6"
          >
            <label htmlFor="activity-log" className="sr-only">
              Activity log
            </label>
            <textarea
              id="activity-log"
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              rows={6}
              disabled={!threadReady || loading}
              placeholder='Try: "I took the bus 10 km instead of driving" or "Lunch was a plant-based bowl."'
              className="min-h-[160px] flex-1 resize-y rounded-2xl border border-stone-200/90 bg-stone-50/80 px-4 py-3 text-base text-stone-800 outline-none ring-emerald-500/30 transition placeholder:text-stone-400 focus:border-emerald-300 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                Powered by Google Gemini + Backboard thread history.
              </p>
              <button
                type="submit"
                disabled={!threadReady || loading || !logText.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gs-moss)] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:bg-[var(--gs-forest)] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
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

        <aside className="flex flex-col gap-4 lg:col-span-5">
          <h2 className="text-lg font-semibold text-[var(--gs-forest)]">
            Impact card
          </h2>
          <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-white/90 to-emerald-50/50 p-6 shadow-lg shadow-emerald-900/10 backdrop-blur">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">
                  Total CO₂e avoided (est.)
                </p>
                <p
                  className="mt-1 text-4xl font-semibold text-[var(--gs-forest)] sm:text-5xl"
                  style={{ fontFamily: 'var(--font-fraunces), serif' }}
                >
                  {coach ? coach.total_saved.toFixed(2) : '—'}
                  <span className="ml-1 text-xl font-medium text-emerald-800/90 sm:text-2xl">
                    kg
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-center shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">
                  Streak
                </p>
                <p className="text-2xl font-bold text-amber-900">
                  {streak > 0 ? streak : '—'}
                </p>
                <p className="text-[10px] text-amber-900/70">days logging</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  This entry
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-800">
                  {coach ? `${coach.impact_score.toFixed(2)} kg` : '—'}
                </p>
                <p className="mt-1 text-xs text-stone-500">CO₂e (rough)</p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Coach note
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  {coach?.insight ??
                    'Your insight will appear after your first log.'}
                </p>
              </div>
            </div>

            <div className="mt-auto rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">
                Next challenge
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-950">
                {coach?.challenge ??
                  'Log an action to receive a tailored micro-challenge.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="mt-auto rounded-2xl border border-stone-200/80 bg-[var(--gs-sand)]/80 px-4 py-4 text-sm text-stone-700 shadow-inner backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          The Echo Effect
        </p>
        <p className="mt-2 leading-relaxed text-stone-700">
          {echoNote ??
            'Each time you ask for coaching, we will estimate the carbon footprint of that AI call here using Gemini.'}
        </p>
      </footer>
    </div>
  );
}
