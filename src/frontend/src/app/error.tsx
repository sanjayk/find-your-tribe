'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-[520px] text-center">
        <p className="font-serif text-[80px] sm:text-[120px] md:text-[160px] leading-[0.85] tracking-[-0.04em] text-surface-secondary select-none">
          500
        </p>

        <div className="mx-auto w-10 h-[3px] bg-accent rounded-full mt-6 mb-8" />

        <h1 className="font-serif text-[28px] sm:text-[34px] leading-[1.15] tracking-[-0.01em] text-ink mb-4">
          Something broke
        </h1>

        <p className="text-[15px] text-ink-secondary leading-[1.7] max-w-sm mx-auto mb-10">
          An unexpected error occurred. This has been noted and we&apos;ll look
          into it.
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center justify-center bg-accent text-white font-medium text-[14px] px-6 py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
        >
          Try again
        </button>

        <p className="font-mono text-[11px] text-ink-tertiary mt-16 tracking-wide">
          ERR_INTERNAL
        </p>
      </div>
    </div>
  );
}
