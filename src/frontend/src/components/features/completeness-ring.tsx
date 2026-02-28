import { Check } from 'lucide-react';

export interface CompletenessRingProps {
  percentage: number; // 0-100
  size: 'sm' | 'lg';
}

const LG_SIZE = 64;
const LG_STROKE = 4;
const LG_RADIUS = LG_SIZE / 2 - LG_STROKE / 2; // 30
const LG_CIRCUMFERENCE = 2 * Math.PI * LG_RADIUS;

const SM_SIZE = 16;
const SM_STROKE = 2;
const SM_RADIUS = SM_SIZE / 2 - SM_STROKE / 2; // 7
const SM_CIRCUMFERENCE = 2 * Math.PI * SM_RADIUS;

export function CompletenessRing({ percentage, size }: CompletenessRingProps) {
  const isComplete = percentage >= 100;
  const isLg = size === 'lg';

  const dim = isLg ? LG_SIZE : SM_SIZE;
  const stroke = isLg ? LG_STROKE : SM_STROKE;
  const radius = isLg ? LG_RADIUS : SM_RADIUS;
  const circumference = isLg ? LG_CIRCUMFERENCE : SM_CIRCUMFERENCE;

  const clamped = Math.min(100, Math.max(0, percentage));
  const dashoffset = circumference * (1 - clamped / 100);

  const progressColor = isComplete ? 'var(--color-shipped)' : 'var(--color-accent)';

  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={isComplete ? 'Profile complete' : 'Profile completeness'}
      className="relative inline-flex items-center justify-center"
      style={{ width: dim, height: dim }}
    >
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} fill="none">
        {/* Background track */}
        <circle
          data-testid="track-circle"
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="var(--color-surface-secondary)"
          fill="none"
        />
        {/* Progress arc */}
        <circle
          data-testid="progress-arc"
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={progressColor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
        />
      </svg>

      {isLg && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Check className="w-5 h-5 text-shipped" strokeWidth={2.5} />
          ) : (
            <span className="font-mono text-[14px] text-accent leading-none">
              {clamped}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
