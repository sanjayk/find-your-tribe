interface ScoreDisplayProps {
  score: number;
  variant: 'profile' | 'large' | 'inline' | 'small';
}

function getTierColor(score: number) {
  if (score >= 76) return { text: 'text-shipped', bg: 'bg-shipped-subtle' };
  if (score >= 56) return { text: 'text-accent', bg: 'bg-accent-subtle' };
  if (score >= 31) return { text: 'text-in-progress', bg: 'bg-in-progress-subtle' };
  return { text: 'text-ink-tertiary', bg: 'bg-surface-secondary' };
}

export function ScoreDisplay({ score, variant }: ScoreDisplayProps) {
  if (variant === 'profile') {
    const tier = getTierColor(score);
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${tier.bg}`}
        >
          <span className={`font-mono text-[28px] font-medium leading-none ${tier.text}`}>
            {score}
          </span>
        </div>
        <span className="text-[11px] text-ink-tertiary">Builder Score</span>
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[48px] font-medium text-accent leading-none">
          {score}
        </span>
        <span className="font-mono text-[20px] text-ink-tertiary leading-none">/100</span>
        <span className="text-[12px] text-ink-tertiary leading-none ml-2">
          builder<br />score
        </span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[32px] font-medium text-accent leading-none">
          {score}
        </span>
        <span className="text-[11px] text-ink-tertiary">score</span>
      </div>
    );
  }

  // small variant
  return (
    <span className="font-mono text-[22px] font-medium text-accent leading-none">
      {score}
    </span>
  );
}
