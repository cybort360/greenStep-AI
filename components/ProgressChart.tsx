'use client';

export type HistoryEntry = {
  date: string;   // "YYYY-MM-DD"
  saved: number;  // kg CO₂e for this entry
};

const HISTORY_KEY = 'greenstep_history';

export function readHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as HistoryEntry[];
  } catch {
    return [];
  }
}

export function appendHistory(saved: number): HistoryEntry[] {
  const history = readHistory();
  const entry: HistoryEntry = { date: new Date().toISOString().slice(0, 10), saved };
  const updated = [...history, entry].slice(-20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export function ProgressChart({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return null;

  const entries = history.slice(-12);
  const max = Math.max(...entries.map(e => e.saved), 0.01);

  const BAR_W = 24;
  const GAP = 10;
  const CHART_H = 72;
  const LABEL_H = 20;
  const totalW = entries.length * (BAR_W + GAP) - GAP;
  const totalH = CHART_H + LABEL_H;

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm dark:border-stone-700/80 dark:bg-stone-800/60">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        CO₂e saved per log
      </p>
      <div className="overflow-x-auto">
        <svg
          width={totalW}
          height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ minWidth: '100%' }}
          aria-label="Bar chart of CO₂e saved per log entry"
        >
          {entries.map((entry, i) => {
            const barH = Math.max((entry.saved / max) * CHART_H, 3);
            const x = i * (BAR_W + GAP);
            const y = CHART_H - barH;
            const label = entry.date.slice(5).replace('-', '/'); // "MM/DD"
            const isMax = entry.saved === max;

            return (
              <g key={i}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  rx={5}
                  fill={isMax ? '#10b981' : '#6ee7b7'}
                  className="transition-all duration-300"
                />
                {/* Value label on tallest bar */}
                {isMax && (
                  <text
                    x={x + BAR_W / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#059669"
                    fontSize={9}
                    fontWeight={600}
                  >
                    {entry.saved.toFixed(2)}
                  </text>
                )}
                {/* Date label */}
                <text
                  x={x + BAR_W / 2}
                  y={CHART_H + 14}
                  textAnchor="middle"
                  fill="#a8a29e"
                  fontSize={8.5}
                >
                  {label}
                </text>
                {/* Tooltip via title */}
                <title>{`${entry.date}: ${entry.saved.toFixed(2)} kg CO₂e`}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-right text-[10px] text-stone-400 dark:text-stone-500">
        Last {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </p>
    </div>
  );
}
