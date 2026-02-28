'use client';

import { CompletenessRing } from './completeness-ring';

const FIELD_LABELS: Record<string, { label: string; scrollId: string }> = {
  avatar: { label: 'Add an avatar', scrollId: 'field-avatar' },
  headline: { label: 'Add a headline', scrollId: 'field-headline' },
  bio: { label: 'Add a bio', scrollId: 'field-bio' },
  role: { label: 'Set your role', scrollId: 'field-role' },
  timezone: { label: 'Set your timezone', scrollId: 'field-timezone' },
  contact_links: { label: 'Add contact links', scrollId: 'field-contact-links' },
};

export interface CompletenessSectionProps {
  completeness: number; // 0.0-1.0 from API
  missingFields: string[]; // e.g. ["bio", "timezone"]
}

function getSubtitle(completeness: number, missingCount: number): string {
  if (completeness >= 1.0) {
    return 'All fields filled. Your profile is ready for discovery.';
  }
  if (completeness === 0) {
    return 'Complete your profile so other builders can find and evaluate you.';
  }
  return `${missingCount} fields remaining`;
}

function scrollToField(scrollId: string): void {
  document.getElementById(scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => document.getElementById(scrollId)?.focus(), 300);
}

export function CompletenessSection({ completeness, missingFields }: CompletenessSectionProps) {
  const isComplete = completeness >= 1.0;
  const percentage = Math.round(completeness * 100);
  const subtitle = getSubtitle(completeness, missingFields.length);

  return (
    <div className="bg-surface-elevated shadow-sm rounded-xl p-6">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6">
        {/* Ring */}
        <div className="shrink-0">
          <CompletenessRing percentage={percentage} size="lg" />
        </div>

        {/* Text + checklist */}
        <div className="flex-1 min-w-0">
          <p className="font-sans font-medium text-ink">
            {isComplete ? 'Profile Complete' : 'Profile Completeness'}
          </p>
          <p className="text-ink-tertiary text-[13px] mt-0.5">{subtitle}</p>

          {!isComplete && missingFields.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {missingFields.map((field) => {
                const meta = FIELD_LABELS[field];
                if (!meta) return null;
                return (
                  <li key={field}>
                    <button
                      type="button"
                      onClick={() => scrollToField(meta.scrollId)}
                      className="flex items-center gap-2 text-accent text-[13px] font-medium hover:text-accent-hover transition-colors"
                    >
                      <span aria-hidden="true">○</span>
                      {meta.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
