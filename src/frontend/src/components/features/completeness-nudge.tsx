import Link from 'next/link';
import { CompletenessRing } from './completeness-ring';

interface CompletenessNudgeProps {
  completeness: number; // 0.0-1.0 from API
}

export function CompletenessNudge({ completeness }: CompletenessNudgeProps) {
  if (completeness >= 1.0) {
    return null;
  }

  const percentage = Math.round(completeness * 100);

  return (
    <div className="inline-flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-1.5">
      <CompletenessRing percentage={percentage} size="sm" />
      <span className="text-ink-secondary text-[12px]">
        {percentage}% complete ·
      </span>
      <Link href="/settings" className="text-accent text-[12px] font-medium">
        Finish profile →
      </Link>
    </div>
  );
}
