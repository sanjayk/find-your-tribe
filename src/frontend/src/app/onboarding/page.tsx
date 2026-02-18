'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { COMPLETE_ONBOARDING } from '@/lib/graphql/mutations/auth';
import { useAuth } from '@/hooks/use-auth';

const PRIMARY_ROLES = [
  { value: '', label: 'Select a role' },
  { value: 'ENGINEER', label: 'Engineer' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'PM', label: 'Product Manager' },
  { value: 'MARKETER', label: 'Marketer' },
  { value: 'GROWTH', label: 'Growth' },
  { value: 'FOUNDER', label: 'Founder' },
  { value: 'OTHER', label: 'Other' },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Select availability' },
  { value: 'OPEN_TO_TRIBE', label: 'Open to tribe' },
  { value: 'AVAILABLE_FOR_PROJECTS', label: 'Available for projects' },
  { value: 'JUST_BROWSING', label: 'Just browsing' },
] as const;

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [timezone, setTimezone] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-fill display name from auth state and detect timezone
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
    setTimezone(detectTimezone());
  }, [user]);

  const [completeOnboarding, { loading }] = useMutation(COMPLETE_ONBOARDING, {
    onCompleted: () => {
      const username = user?.username || '';
      router.push(`/profile/${username}`);
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    completeOnboarding({
      variables: {
        displayName,
        headline: headline || null,
        primaryRole: primaryRole || null,
        timezone: timezone || null,
        availabilityStatus: availabilityStatus || null,
      },
    });
  }

  const selectClasses =
    'w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink appearance-none outline-none transition-colors focus:ring-2 focus:ring-accent/30';

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-[480px]">
        <div className="bg-surface-elevated rounded-2xl shadow-md p-8">
          {/* Header */}
          <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-2">
            Set up your profile
          </h1>
          <p className="text-[14px] text-ink-secondary mb-8">
            Tell the community what you build
          </p>

          {/* Error */}
          {error && (
            <div className="bg-error-subtle text-error rounded-lg p-3 text-[13px] mb-5">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Maya Chen"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label
                htmlFor="headline"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Headline
              </label>
              <input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Full-stack engineer who ships fast"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label
                htmlFor="primaryRole"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Primary role
              </label>
              <select
                id="primaryRole"
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value)}
                className={selectClasses}
              >
                {PRIMARY_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="timezone"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Timezone
              </label>
              <input
                id="timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label
                htmlFor="availabilityStatus"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Availability
              </label>
              <select
                id="availabilityStatus"
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className={selectClasses}
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white rounded-lg px-6 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Complete setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
