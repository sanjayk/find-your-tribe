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

const DEFAULT_LABELS = ['X', 'LinkedIn', 'Threads', 'GitHub', 'Linear'];

type Section = 'profile' | 'links' | 'agent' | 'preferences';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'links', label: 'Links' },
  { id: 'agent', label: 'Agent' },
  { id: 'preferences', label: 'Preferences' },
];

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

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [timezone, setTimezone] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [linkRows, setLinkRows] = useState<{ label: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [populated, setPopulated] = useState(false);

  const timezoneGroups = useMemo(() => buildTimezoneGroups(), []);

  const { data, loading: queryLoading } = useQuery<GetBuilderData>(GET_BUILDER, {
    variables: { username: user?.username },
    skip: !user?.username,
  });

  useEffect(() => {
    if (data?.user && !populated) {
      const builder = data.user;
      setDisplayName(builder.displayName || '');
      setHeadline(builder.headline || '');
      setBio(builder.bio || '');
      setPrimaryRole(builder.primaryRole || '');
      setTimezone(builder.timezone || '');
      setAvailabilityStatus(builder.availabilityStatus || '');
      const links = builder.contactLinks || {};
      const rows: { label: string; url: string }[] = [];
      for (const label of DEFAULT_LABELS) {
        rows.push({ label, url: links[label] || '' });
      }
      for (const [key, value] of Object.entries(links)) {
        if (!DEFAULT_LABELS.includes(key)) {
          rows.push({ label: key, url: value as string });
        }
      }
      setLinkRows(rows);
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
    const contactLinks: Record<string, string> = {};
    for (const row of linkRows) {
      const label = row.label.trim();
      const url = row.url.trim();
      if (label && url) contactLinks[label] = url;
    }
    updateProfile({
      variables: {
        displayName: displayName || null,
        headline: headline || null,
        bio: bio || null,
        primaryRole: primaryRole || null,
        timezone: timezone || null,
        availabilityStatus: availabilityStatus || null,
        contactLinks,
      },
    });
  }

  const selectClasses =
    'w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink appearance-none outline-none transition-colors focus:ring-2 focus:ring-accent/30';
  const inputClasses =
    'w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30';

  if (queryLoading) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
        <div className="w-full max-w-[720px]">
          <div className="bg-surface-elevated rounded-2xl shadow-md p-8 animate-pulse" data-testid="settings-skeleton">
            <div className="h-8 w-48 bg-surface-secondary rounded mb-2" />
            <div className="h-4 w-64 bg-surface-secondary rounded mb-8" />
            <div className="flex gap-8">
              <div className="w-[160px] shrink-0 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 w-20 bg-surface-secondary rounded" />
                ))}
              </div>
              <div className="flex-1 space-y-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-24 bg-surface-secondary rounded mb-2" />
                    <div className="h-11 w-full bg-surface-secondary rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-[720px]">
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

          {/* Sidebar + Content */}
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Sidebar Nav */}
            <nav className="flex sm:flex-col gap-1 sm:w-[160px] sm:shrink-0 sm:sticky sm:top-8 sm:self-start" aria-label="Settings sections">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`text-left text-[13px] py-1 px-2 sm:px-0 rounded-md sm:rounded-none transition-colors ${
                    activeSection === section.id
                      ? 'text-ink font-medium'
                      : 'text-ink-tertiary hover:text-ink-secondary'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>

            {/* Content Area */}
            <div className="flex-1 min-w-0 min-h-[420px]">
              {activeSection === 'profile' && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                    Profile
                  </h2>

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
                      className={inputClasses}
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
                      className={inputClasses}
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
                      className={`${inputClasses} resize-none`}
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

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-accent text-white rounded-lg px-6 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              )}

              {activeSection === 'links' && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                    Links
                  </h2>

                  <div className="space-y-3">
                    {linkRows.map((row, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => {
                            const next = [...linkRows];
                            next[index] = { ...row, label: e.target.value };
                            setLinkRows(next);
                          }}
                          placeholder="Label"
                          aria-label={`Link ${index + 1} label`}
                          className={`${inputClasses} !w-[30%] shrink-0`}
                        />
                        <input
                          type="text"
                          value={row.url}
                          onChange={(e) => {
                            const next = [...linkRows];
                            next[index] = { ...row, url: e.target.value };
                            setLinkRows(next);
                          }}
                          placeholder="https://..."
                          aria-label={`Link ${index + 1} URL`}
                          className={`${inputClasses} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => setLinkRows(linkRows.filter((_, i) => i !== index))}
                          className="text-ink-tertiary hover:text-ink-secondary transition-colors p-1 shrink-0"
                          aria-label={`Remove link ${index + 1}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setLinkRows([...linkRows, { label: '', url: '' }])}
                    className="text-[13px] text-accent hover:text-accent-hover transition-colors"
                  >
                    Add link
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-accent text-white rounded-lg px-6 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              )}

              {activeSection === 'agent' && (
                <div>
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                    Agent
                  </h2>
                  <p className="text-[14px] text-ink-tertiary">Coming soon</p>
                </div>
              )}

              {activeSection === 'preferences' && (
                <div>
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                    Preferences
                  </h2>
                  <p className="text-[14px] text-ink-tertiary">Coming soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
