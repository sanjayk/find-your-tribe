'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import { UPDATE_PROFILE } from '@/lib/graphql/mutations/profile';
import type { GetBuilderData, UpdateProfileData } from '@/lib/graphql/types';

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

function buildTimezoneGroups(): { region: string; zones: { value: string; label: string }[] }[] {
  try {
    const allZones = Intl.supportedValuesOf('timeZone');
    const regionMap = new Map<string, { value: string; label: string }[]>();

    for (const tz of allZones) {
      const slash = tz.indexOf('/');
      if (slash === -1) continue;

      const region = tz.slice(0, slash);
      const city = tz.slice(slash + 1).replaceAll('_', ' ').replaceAll('/', ' / ');

      if (!regionMap.has(region)) regionMap.set(region, []);
      regionMap.get(region)!.push({ value: tz, label: city });
    }

    return Array.from(regionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, zones]) => ({
        region,
        zones: zones.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  } catch {
    return [];
  }
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [timezone, setTimezone] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [populated, setPopulated] = useState(false);

  const timezoneGroups = useMemo(() => buildTimezoneGroups(), []);

  const { data, loading: queryLoading } = useQuery<GetBuilderData>(GET_BUILDER, {
    variables: { username: user?.username },
    skip: !user?.username,
  });

  // Pre-fill form from query data
  useEffect(() => {
    if (data?.user && !populated) {
      const builder = data.user;
      setDisplayName(builder.displayName || '');
      setHeadline(builder.headline || '');
      setBio(builder.bio || '');
      setPrimaryRole(builder.primaryRole || '');
      setTimezone(builder.timezone || '');
      setAvailabilityStatus(builder.availabilityStatus || '');
      setPopulated(true);
    }
  }, [data, populated]);

  const [updateProfile, { loading: saving }] = useMutation<UpdateProfileData>(UPDATE_PROFILE, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    updateProfile({
      variables: {
        displayName: displayName || null,
        headline: headline || null,
        bio: bio || null,
        primaryRole: primaryRole || null,
        timezone: timezone || null,
        availabilityStatus: availabilityStatus || null,
      },
    });
  }

  const selectClasses =
    'w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink appearance-none outline-none transition-colors focus:ring-2 focus:ring-accent/30';

  if (queryLoading) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
        <div className="w-full max-w-[480px]">
          <div className="bg-surface-elevated rounded-2xl shadow-md p-8 animate-pulse" data-testid="settings-skeleton">
            <div className="h-8 w-48 bg-surface-secondary rounded mb-2" />
            <div className="h-4 w-64 bg-surface-secondary rounded mb-8" />
            <div className="space-y-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i}>
                  <div className="h-3 w-24 bg-surface-secondary rounded mb-2" />
                  <div className="h-11 w-full bg-surface-secondary rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-[480px]">
        <div className="bg-surface-elevated rounded-2xl shadow-md p-8">
          {/* Back link */}
          {user?.username && (
            <Link
              href={`/profile/${user.username}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to profile
            </Link>
          )}

          {/* Header */}
          <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-2">
            Settings
          </h1>
          <p className="text-[14px] text-ink-secondary mb-8">
            Update your profile information
          </p>

          {/* Error */}
          {error && (
            <div className="bg-error-subtle text-error rounded-lg p-3 text-[13px] mb-5" role="alert">
              {error}
            </div>
          )}

          {/* Success */}
          {saved && (
            <div className="bg-shipped-subtle text-shipped rounded-lg p-3 text-[13px] mb-5" role="status">
              Profile updated successfully
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
                htmlFor="bio"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself and what you're building"
                rows={3}
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30 resize-none"
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
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={selectClasses}
              >
                <option value="">Select a timezone</option>
                {timezoneGroups.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.zones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
              disabled={saving}
              className="w-full bg-accent text-white rounded-lg px-6 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
