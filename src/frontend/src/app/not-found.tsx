import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-[520px] text-center">
        {/* Large editorial number */}
        <p className="font-serif text-[80px] sm:text-[120px] md:text-[160px] leading-[0.85] tracking-[-0.04em] text-surface-secondary select-none">
          404
        </p>

        {/* Accent line */}
        <div className="mx-auto w-10 h-[3px] bg-accent rounded-full mt-6 mb-8" />

        {/* Headline */}
        <h1 className="font-serif text-[28px] sm:text-[34px] leading-[1.15] tracking-[-0.01em] text-ink mb-4">
          This page wandered off
        </h1>

        {/* Description */}
        <p className="text-[15px] text-ink-secondary leading-[1.7] max-w-sm mx-auto mb-10">
          Whatever you were looking for isn&apos;t here. It may have been moved,
          removed, or never existed in the first place.
        </p>

        {/* Navigation options */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-accent text-white font-medium text-[14px] px-6 py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to home
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center bg-surface-elevated text-ink font-medium text-[14px] px-6 py-2.5 rounded-lg shadow-xs hover:shadow-sm transition-all"
          >
            Discover builders
          </Link>
        </div>

        {/* Subtle footer note */}
        <p className="font-mono text-[11px] text-ink-tertiary mt-16 tracking-wide">
          ERR_NOT_FOUND
        </p>
      </div>
    </div>
  );
}
