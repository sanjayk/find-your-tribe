interface ScoreDisplayProps {
  score: number;
  variant: 'large' | 'inline' | 'small';
}

export function ScoreDisplay({ score, variant }: ScoreDisplayProps) {
  if (variant === 'large') {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[48px] font-medium text-accent leading-none">
          {score}
        </span>
        <span className="text-[12px] text-ink-tertiary leading-none">
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
