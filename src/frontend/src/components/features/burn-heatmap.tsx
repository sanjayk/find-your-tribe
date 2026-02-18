'use client';

import type { CSSProperties } from 'react';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKS_PER_MONTH = [4, 5, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4];

export interface BurnDay {
  date: string;  // ISO date
  tokens: number;
}

export interface BurnHeatmapProps {
  dailyActivity: BurnDay[];
  stats: {
    daysActive: number;
    totalTokens: string;  // formatted, e.g. "1.2M"
    activeWeeks: string;  // e.g. "46 / 52"
    shipped: string;      // e.g. "4 / 5"
  };
}

const TOTAL_WEEKS = 52;
const DAYS_PER_WEEK = 7;

function getIntensityLevel(tokens: number, maxTokens: number): 0 | 1 | 2 | 3 | 4 {
  if (tokens === 0 || maxTokens === 0) return 0;
  const ratio = tokens / maxTokens;
  if (ratio < 0.15) return 1;
  if (ratio < 0.4) return 2;
  if (ratio < 0.7) return 3;
  return 4;
}

const INTENSITY_CLASSES: Record<number, string> = {
  0: 'bg-surface-secondary',
  1: 'bg-accent-subtle',
  2: 'bg-accent-muted',
  3: 'bg-accent opacity-70',
  4: 'bg-accent',
};

// For level-3 we need a special approach since opacity-70 affects the whole cell
// Instead use inline style for level-3
function getCellStyle(level: 0 | 1 | 2 | 3 | 4): CSSProperties {
  if (level === 3) {
    return { backgroundColor: 'color-mix(in srgb, var(--color-accent) 70%, transparent)' };
  }
  return {};
}

function getCellClass(level: 0 | 1 | 2 | 3 | 4): string {
  if (level === 3) return '';
  return INTENSITY_CLASSES[level];
}

export function BurnHeatmap({ dailyActivity, stats }: BurnHeatmapProps) {
  const now = new Date();

  // Build a map of date -> tokens for fast lookup
  const tokenMap = new Map<string, number>();
  let maxTokens = 0;
  for (const day of dailyActivity) {
    tokenMap.set(day.date, day.tokens);
    if (day.tokens > maxTokens) maxTokens = day.tokens;
  }

  // Build 52×7 grid: columns are weeks (left=oldest, right=newest)
  // The last column ends at today (Sunday of current week or today's weekday)
  // Each column = one week, each row = one day (row 0 = Sunday)
  const endDate = new Date(now);
  // We want 52*7 days ending today (inclusive)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (TOTAL_WEEKS * DAYS_PER_WEEK - 1));

  // Build columns: each column = 7 days
  const columns: Array<Array<{ date: string; level: 0 | 1 | 2 | 3 | 4 }>> = [];
  const cursor = new Date(startDate);
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const col: Array<{ date: string; level: 0 | 1 | 2 | 3 | 4 }> = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const isoDate = cursor.toISOString().slice(0, 10);
      const tokens = tokenMap.get(isoDate) ?? 0;
      col.push({ date: isoDate, level: getIntensityLevel(tokens, maxTokens) });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  // Month labels: find which column each month starts at
  const monthLabels: Array<{ label: string; colIndex: number }> = [];
  let col = 0;
  const startMonthIdx = (now.getMonth() + 1) % 12; // month after current = oldest month shown
  for (let m = 0; m < 12; m++) {
    const monthIdx = (startMonthIdx + m) % 12;
    monthLabels.push({ label: MONTH_LABELS[monthIdx], colIndex: col });
    col += WEEKS_PER_MONTH[m];
  }

  const legendLevels: Array<0 | 1 | 2 | 3 | 4> = [0, 1, 2, 3, 4];

  return (
    <div>
      {/* Header: label + legend — OUTSIDE the white card */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-tertiary">
          Building activity
        </span>
        <div className="flex items-center gap-1 text-[10px] text-ink-tertiary">
          <span>Less</span>
          {legendLevels.map((level) => (
            <div
              key={level}
              className={`w-[10px] h-[10px] rounded-full ${getCellClass(level)}`}
              style={getCellStyle(level)}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* White card — contains grid, months, stats */}
      <div className="bg-surface-elevated shadow-sm p-6 rounded-[16px] overflow-hidden">
        {/* Heatmap grid */}
        <div className="overflow-x-auto">
        <div className="min-w-[620px]">
        <div className="grid grid-cols-[repeat(52,1fr)] gap-[2px]" data-testid="heatmap-grid">
          {columns.map((col, w) => (
            <div key={w} className="flex flex-col gap-[2px]">
              {col.map((cell) => (
                <div
                  key={cell.date}
                  data-date={cell.date}
                  data-level={cell.level}
                  data-testid="heatmap-cell"
                  title={cell.date}
                  className={`aspect-square rounded-full transition-transform duration-100 cursor-pointer hover:scale-[1.4] ${getCellClass(cell.level)}`}
                  style={getCellStyle(cell.level)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Month labels */}
        <div className="relative mt-2" style={{ height: '14px' }} aria-label="month labels">
          {monthLabels.map(({ label, colIndex }) => (
            <span
              key={`${label}-${colIndex}`}
              data-testid="month-label"
              className="absolute font-mono text-ink-tertiary uppercase tracking-[0.03em] text-[10px]"
              style={{
                left: `${(colIndex / TOTAL_WEEKS) * 100}%`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        </div>
        </div>

        {/* Summary stats */}
        <div className="flex flex-wrap gap-x-7 gap-y-3 mt-4 pt-4 border-t border-surface-secondary">
          <div className="flex flex-col">
            <span className="font-mono font-medium text-[18px] leading-none">
              {stats.daysActive}
            </span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-ink-tertiary mt-0.5">
              Days active
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-medium text-[18px] leading-none">
              {stats.totalTokens}
            </span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-ink-tertiary mt-0.5">
              Tokens burned
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-medium text-[18px] leading-none">
              {stats.activeWeeks}
            </span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-ink-tertiary mt-0.5">
              Active weeks
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-medium text-[18px] leading-none">
              {stats.shipped}
            </span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-ink-tertiary mt-0.5">
              Shipped
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
