'use client';

interface BurnMapProps {
  /** Daily values (52×7 = 364), 0-1 normalized intensity. Index 0 = 52 weeks ago, day 0. */
  data: number[];
  /** Compact mode: 26 weeks instead of 52 */
  compact?: boolean;
}

const ACCENT_COLORS = [
  '#f2f0ed', // 0 — empty
  '#e8e4f8', // 1 — hint
  '#c7d2fe', // 2 — light
  '#a5b4fc', // 3 — medium
  '#818cf8', // 4 — strong
  '#6366f1', // 5 — heavy
  '#4f46e5', // 6 — intense
];

function intensityToColor(value: number): string {
  const idx = Math.round(value * (ACCENT_COLORS.length - 1));
  return ACCENT_COLORS[Math.min(idx, ACCENT_COLORS.length - 1)];
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Responsive dot-grid heatmap.
 *
 * Renders N columns × 7 rows of dots that scale to fill the container.
 * Each dot = 1 day. Columns = weeks. Reads left-to-right, top-to-bottom.
 */
export function BurnMapDotGrid({ data, compact = false }: BurnMapProps) {
  const weeks = compact ? 26 : 52;
  const days = 7;

  const slicedData = compact ? data.slice(26 * days) : data;

  const now = new Date();
  const startMonth = compact
    ? (now.getMonth() + 7) % 12
    : (now.getMonth() + 1) % 12;

  const monthMarkers: { label: string; col: number }[] = [];
  const weeksPerMonth = compact
    ? [4, 5, 4, 4, 5, 4]
    : [4, 5, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4];
  let col = 0;
  const monthCount = compact ? 6 : 12;
  for (let m = 0; m < monthCount; m++) {
    monthMarkers.push({
      label: MONTH_LABELS[(startMonth + m) % 12],
      col,
    });
    col += weeksPerMonth[m];
  }

  // Transpose: data is week-major (week0day0, week0day1, ...), grid renders row-major
  const transposed: number[] = [];
  for (let day = 0; day < days; day++) {
    for (let week = 0; week < weeks; week++) {
      transposed.push(slicedData[week * days + day] ?? 0);
    }
  }

  return (
    <div>
      {/* Month labels */}
      <div className="relative w-full mb-1" style={{ height: '14px' }}>
        {monthMarkers.map((marker, i) => (
          <span
            key={i}
            className="absolute font-mono text-ink-tertiary"
            style={{
              fontSize: '9px',
              left: `${(marker.col / weeks) * 100}%`,
            }}
          >
            {marker.label}
          </span>
        ))}
      </div>
      {/* Responsive dot grid — dots scale to fill container width */}
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${weeks}, 1fr)`,
          gridTemplateRows: `repeat(${days}, 1fr)`,
          gap: '3px',
          aspectRatio: `${weeks} / ${days}`,
        }}
      >
        {transposed.map((value, i) => (
          <div
            key={i}
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '50%',
              backgroundColor: intensityToColor(value),
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Generate fake burn data for prototyping (364 values: 52 weeks × 7 days) */
export function generateMockBurnData(
  pattern: 'heavy' | 'moderate' | 'sporadic' | 'new' | 'dormant',
): number[] {
  const data: number[] = [];
  const totalDays = 52 * 7;
  for (let i = 0; i < totalDays; i++) {
    const week = Math.floor(i / 7);
    const day = i % 7;
    const weekendDampen = (day === 0 || day === 6) ? 0.3 : 1;
    let base: number;
    switch (pattern) {
      case 'heavy':
        base = (0.4 + Math.random() * 0.6) * weekendDampen;
        break;
      case 'moderate':
        base = (0.2 + Math.random() * 0.5) * weekendDampen;
        break;
      case 'sporadic':
        base = Math.random() > 0.6 ? (0.3 + Math.random() * 0.5) * weekendDampen : 0;
        break;
      case 'new':
        base = week > 40 ? (0.3 + Math.random() * 0.7) * weekendDampen : 0;
        break;
      case 'dormant':
        base = week < 20 ? (0.3 + Math.random() * 0.4) * weekendDampen : Math.random() * 0.05;
        break;
    }
    data.push(Math.min(1, Math.max(0, base)));
  }
  return data;
}
