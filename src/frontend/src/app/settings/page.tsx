'use client';

import { useState, useMemo, useRef, type FormEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import { MY_API_TOKENS } from '@/lib/graphql/queries/tokens';
import { UPDATE_PROFILE } from '@/lib/graphql/mutations/profile';
import { CREATE_API_TOKEN, REVOKE_API_TOKEN } from '@/lib/graphql/mutations/tokens';
import type {
  GetBuilderData,
  UpdateProfileData,
  GetMyApiTokensData,
  CreateApiTokenData,
  RevokeApiTokenData,
  ApiTokenInfo,
} from '@/lib/graphql/types';

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

const EDITORS = ['Cursor', 'VS Code', 'Windsurf', 'Zed', 'JetBrains', 'Neovim', 'Emacs', 'Terminal', 'Replit'];
const AGENTS = ['Claude Code', 'Copilot', 'Cline', 'Aider', 'Codex', 'Devin', 'Junie', 'Jules', 'Amazon Q'];
const MODELS = ['Claude Opus', 'Claude Sonnet', 'GPT-5', 'Gemini 3 Pro', 'DeepSeek', 'Llama 3', 'Mistral Large', 'Codestral'];

const WORKFLOW_STYLES = ['Pair builder', 'Swarm delegation', 'AI review', 'Autonomous agents', 'Minimal AI'];

type Section = 'profile' | 'links' | 'agent' | 'preferences' | 'integrations';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'links', label: 'Links' },
  { id: 'agent', label: 'Agent' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'integrations', label: 'Integrations' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

function ChipSection({
  label,
  presets,
  selected,
  custom,
  onToggle,
  onAddCustom,
  onRemoveCustom,
}: {
  label: string;
  presets: string[];
  selected: string[];
  custom: string[];
  onToggle: (val: string) => void;
  onAddCustom: (val: string) => void;
  onRemoveCustom: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const val = inputRef.current?.value.trim();
    if (!val) return;
    if (presets.includes(val) || custom.includes(val)) return;
    onAddCustom(val);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <span className="text-[13px] font-medium text-ink-secondary mb-2 block">
        {label}
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {presets.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                isSelected
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'bg-surface-secondary text-ink-tertiary hover:text-ink-secondary'
              }`}
              aria-pressed={isSelected}
            >
              {item}
            </button>
          );
        })}
        {custom.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <span key={item} className="inline-flex items-center gap-0">
              <button
                type="button"
                onClick={() => onToggle(item)}
                className={`text-[13px] pl-3 pr-1 py-1.5 rounded-l-full transition-colors ${
                  isSelected
                    ? 'bg-accent-subtle text-accent font-medium'
                    : 'bg-surface-secondary text-ink-tertiary hover:text-ink-secondary'
                }`}
                aria-pressed={isSelected}
              >
                {item}
              </button>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onRemoveCustom(item)}
                className={`text-[13px] pl-0.5 pr-2 py-1.5 rounded-r-full transition-colors ${
                  isSelected
                    ? 'bg-accent-subtle text-accent hover:text-accent-hover'
                    : 'bg-surface-secondary text-ink-tertiary hover:text-ink'
                }`}
              >
                &times;
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add custom..."
          aria-label={`Add custom ${label.toLowerCase()}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="bg-surface-primary rounded-lg px-3 py-1.5 text-[13px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30 w-full sm:w-[180px]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="text-[13px] text-accent hover:text-accent-hover transition-colors font-medium"
        >
          + Add
        </button>
      </div>
    </div>
  );
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
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [customEditors, setCustomEditors] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [customAgents, setCustomAgents] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [customWorkflows, setCustomWorkflows] = useState<string[]>([]);
  const [setupNote, setSetupNote] = useState('');
  const [humanAiRatio, setHumanAiRatio] = useState(50);
  const [notifTribeInvites, setNotifTribeInvites] = useState(true);
  const [notifProjectUpdates, setNotifProjectUpdates] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showTimezone, setShowTimezone] = useState(true);
  const [showAgentSetup, setShowAgentSetup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [populated, setPopulated] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const timezoneGroups = useMemo(() => buildTimezoneGroups(), []);

  const { data, loading: queryLoading } = useQuery<GetBuilderData>(GET_BUILDER, {
    variables: { username: user?.username },
    skip: !user?.username,
  });

  const { data: tokensData } = useQuery<GetMyApiTokensData>(MY_API_TOKENS, {
    skip: !user,
  });

  // Populate form fields when query data arrives (render-time state sync)
  if (data?.user && !populated) {
    setPopulated(true);
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
    const tools = builder.agentTools;
    if (tools && typeof tools === 'object' && !Array.isArray(tools)) {
      const eds = tools.editors || [];
      setSelectedEditors(eds);
      setCustomEditors(eds.filter((e: string) => !EDITORS.includes(e)));

      const ags = tools.agents || [];
      setSelectedAgents(ags);
      setCustomAgents(ags.filter((a: string) => !AGENTS.includes(a)));

      const mods = tools.models || [];
      setSelectedModels(mods);
      setCustomModels(mods.filter((m: string) => !MODELS.includes(m)));

      const wfs = tools.workflowStyles || [];
      setSelectedWorkflows(wfs);
      setCustomWorkflows(wfs.filter((w: string) => !WORKFLOW_STYLES.includes(w)));

      setSetupNote(tools.setupNote || '');
    } else if (Array.isArray(tools)) {
      setSelectedAgents(tools);
    }
    // Backward compat: migrate old agentWorkflowStyle
    if (
      !(tools && typeof tools === 'object' && !Array.isArray(tools) && (tools as Record<string, unknown>).workflowStyles && ((tools as Record<string, unknown>).workflowStyles as string[]).length > 0)
      && builder.agentWorkflowStyle
    ) {
      const STYLE_MAP: Record<string, string> = {
        PAIR: 'Pair builder', SWARM: 'Swarm delegation',
        REVIEW: 'AI review', AUTONOMOUS: 'Autonomous agents', MINIMAL: 'Minimal AI',
      };
      const mapped = STYLE_MAP[builder.agentWorkflowStyle];
      if (mapped) setSelectedWorkflows([mapped]);
    }
    if (builder.humanAgentRatio !== null && builder.humanAgentRatio !== undefined) {
      setHumanAiRatio(Math.round(builder.humanAgentRatio * 100));
    }
    const prefs = builder.preferences || {};
    if (prefs.notifications) {
      if (prefs.notifications.tribeInvites !== undefined) setNotifTribeInvites(prefs.notifications.tribeInvites);
      if (prefs.notifications.projectUpdates !== undefined) setNotifProjectUpdates(prefs.notifications.projectUpdates);
      if (prefs.notifications.weeklyDigest !== undefined) setNotifWeeklyDigest(prefs.notifications.weeklyDigest);
    }
    if (prefs.privacy) {
      if (prefs.privacy.profileVisibility) setProfileVisibility(prefs.privacy.profileVisibility);
      if (prefs.privacy.showTimezone !== undefined) setShowTimezone(prefs.privacy.showTimezone);
      if (prefs.privacy.showAgentSetup !== undefined) setShowAgentSetup(prefs.privacy.showAgentSetup);
    }
  }

  const [updateProfile, { loading: saving }] = useMutation<UpdateProfileData>(UPDATE_PROFILE, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  const [createApiToken, { loading: creatingToken }] = useMutation<CreateApiTokenData>(CREATE_API_TOKEN, {
    onCompleted: (result) => {
      setCreatedToken(result.apiTokens.createApiToken.token);
      setNewTokenName('');
      setCopied(false);
    },
    refetchQueries: [{ query: MY_API_TOKENS }],
  });

  const [revokeApiToken] = useMutation<RevokeApiTokenData>(REVOKE_API_TOKEN, {
    refetchQueries: [{ query: MY_API_TOKENS }],
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
    const agentTools: Record<string, unknown> = {};
    if (selectedEditors.length) agentTools.editors = selectedEditors;
    if (selectedAgents.length) agentTools.agents = selectedAgents;
    if (selectedModels.length) agentTools.models = selectedModels;
    if (selectedWorkflows.length) agentTools.workflowStyles = selectedWorkflows;
    if (setupNote.trim()) agentTools.setupNote = setupNote.trim();

    const preferences = {
      notifications: {
        tribeInvites: notifTribeInvites,
        projectUpdates: notifProjectUpdates,
        weeklyDigest: notifWeeklyDigest,
      },
      privacy: {
        profileVisibility,
        showTimezone,
        showAgentSetup,
      },
    };

    updateProfile({
      variables: {
        displayName: displayName || null,
        headline: headline,
        bio: bio,
        primaryRole: primaryRole || null,
        timezone: timezone || null,
        availabilityStatus: availabilityStatus || null,
        contactLinks,
        agentTools: Object.keys(agentTools).length ? agentTools : {},
        agentWorkflowStyle: null,
        humanAgentRatio: humanAiRatio / 100,
        preferences,
      },
    });
  }

  function handleCreateToken(e: FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setCreatedToken(null);
    setCopied(false);
    createApiToken({ variables: { name: newTokenName.trim() } });
  }

  function handleRevokeConfirm(tokenId: string) {
    revokeApiToken({ variables: { tokenId } });
    setRevokingId(null);
  }

  async function handleCopy() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  const apiTokens: ApiTokenInfo[] = tokensData?.myApiTokens ?? [];

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
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="hidden sm:block sm:w-[160px] shrink-0 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
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
                      maxLength={60}
                      className={inputClasses}
                    />
                    <p className="text-right text-[12px] text-ink-tertiary mt-1">
                      {headline.length} / 60
                    </p>
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
                      maxLength={160}
                      rows={3}
                      className={`${inputClasses} resize-none`}
                    />
                    <p className="text-right text-[12px] text-ink-tertiary mt-1">
                      {bio.length} / 160
                    </p>
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
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                          className={`${inputClasses} sm:!w-[30%] sm:shrink-0`}
                        />
                        <div className="flex items-center gap-2">
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
                            className="text-ink-tertiary hover:text-ink-secondary transition-colors p-2 shrink-0"
                            aria-label={`Remove link ${index + 1}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </div>
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
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                    My Setup
                  </h2>

                  {/* Editors */}
                  <ChipSection
                    label="Editors"
                    presets={EDITORS}
                    selected={selectedEditors}
                    custom={customEditors}
                    onToggle={(val) =>
                      setSelectedEditors(
                        selectedEditors.includes(val)
                          ? selectedEditors.filter((v) => v !== val)
                          : [...selectedEditors, val],
                      )
                    }
                    onAddCustom={(val) => {
                      setCustomEditors([...customEditors, val]);
                      setSelectedEditors([...selectedEditors, val]);
                    }}
                    onRemoveCustom={(val) => {
                      setCustomEditors(customEditors.filter((v) => v !== val));
                      setSelectedEditors(selectedEditors.filter((v) => v !== val));
                    }}
                  />

                  {/* Agents */}
                  <ChipSection
                    label="Agents"
                    presets={AGENTS}
                    selected={selectedAgents}
                    custom={customAgents}
                    onToggle={(val) =>
                      setSelectedAgents(
                        selectedAgents.includes(val)
                          ? selectedAgents.filter((v) => v !== val)
                          : [...selectedAgents, val],
                      )
                    }
                    onAddCustom={(val) => {
                      setCustomAgents([...customAgents, val]);
                      setSelectedAgents([...selectedAgents, val]);
                    }}
                    onRemoveCustom={(val) => {
                      setCustomAgents(customAgents.filter((v) => v !== val));
                      setSelectedAgents(selectedAgents.filter((v) => v !== val));
                    }}
                  />

                  {/* Models */}
                  <ChipSection
                    label="Models"
                    presets={MODELS}
                    selected={selectedModels}
                    custom={customModels}
                    onToggle={(val) =>
                      setSelectedModels(
                        selectedModels.includes(val)
                          ? selectedModels.filter((v) => v !== val)
                          : [...selectedModels, val],
                      )
                    }
                    onAddCustom={(val) => {
                      setCustomModels([...customModels, val]);
                      setSelectedModels([...selectedModels, val]);
                    }}
                    onRemoveCustom={(val) => {
                      setCustomModels(customModels.filter((v) => v !== val));
                      setSelectedModels(selectedModels.filter((v) => v !== val));
                    }}
                  />

                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary !mt-8 mb-5">
                    Workflow
                  </h2>

                  {/* Workflow styles */}
                  <ChipSection
                    label="Style"
                    presets={WORKFLOW_STYLES}
                    selected={selectedWorkflows}
                    custom={customWorkflows}
                    onToggle={(val) =>
                      setSelectedWorkflows(
                        selectedWorkflows.includes(val)
                          ? selectedWorkflows.filter((v) => v !== val)
                          : [...selectedWorkflows, val],
                      )
                    }
                    onAddCustom={(val) => {
                      setCustomWorkflows([...customWorkflows, val]);
                      setSelectedWorkflows([...selectedWorkflows, val]);
                    }}
                    onRemoveCustom={(val) => {
                      setCustomWorkflows(customWorkflows.filter((v) => v !== val));
                      setSelectedWorkflows(selectedWorkflows.filter((v) => v !== val));
                    }}
                  />

                  <div>
                    <label
                      htmlFor="humanAiRatio"
                      className="text-[13px] font-medium text-ink-secondary mb-3 block"
                    >
                      Human / AI ratio
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-ink-tertiary w-12 shrink-0">Human</span>
                      <input
                        id="humanAiRatio"
                        type="range"
                        min={0}
                        max={100}
                        value={humanAiRatio}
                        onChange={(e) => setHumanAiRatio(Number(e.target.value))}
                        className="flex-1 accent-accent"
                      />
                      <span className="text-[12px] text-ink-tertiary w-6 shrink-0 text-right">AI</span>
                    </div>
                    <p className="text-center text-[13px] text-ink-secondary mt-1.5 font-mono">
                      {humanAiRatio} / {100 - humanAiRatio}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="setupNote"
                      className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
                    >
                      Setup note
                    </label>
                    <textarea
                      id="setupNote"
                      value={setupNote}
                      onChange={(e) => setSetupNote(e.target.value)}
                      placeholder="Describe how you work with AI..."
                      maxLength={300}
                      rows={3}
                      className={`${inputClasses} resize-none`}
                    />
                    <p className="text-right text-[12px] text-ink-tertiary mt-1">
                      {setupNote.length} / 300
                    </p>
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

              {activeSection === 'integrations' && (
                <div className="space-y-8">
                  {/* API Tokens */}
                  <div>
                    <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                      API Tokens
                    </h2>

                    {/* Token list */}
                    {apiTokens.length === 0 ? (
                      <p className="text-[13px] text-ink-tertiary">
                        No API tokens yet. Create one below to start using the CLI.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {apiTokens.map((token) => (
                          <div key={token.id} className="bg-surface-primary rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium text-ink truncate">{token.name}</p>
                                <p className="text-[12px] text-ink-tertiary mt-0.5">
                                  Created {formatDate(token.createdAt)}
                                  {' · '}
                                  Last used:{' '}
                                  {token.lastUsedAt ? formatDate(token.lastUsedAt) : 'Never'}
                                </p>
                              </div>
                              <div className="shrink-0">
                                {revokingId === token.id ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setRevokingId(null)}
                                      className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeConfirm(token.id)}
                                      className="text-[13px] text-red-600 hover:text-red-700 font-medium transition-colors"
                                    >
                                      Yes, revoke
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={`Revoke ${token.name}`}
                                    onClick={() => setRevokingId(token.id)}
                                    className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Create new token */}
                  <div>
                    <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-4">
                      Create a new token
                    </h2>
                    <form onSubmit={handleCreateToken} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label htmlFor="tokenName" className="sr-only">
                          Token name
                        </label>
                        <input
                          id="tokenName"
                          type="text"
                          value={newTokenName}
                          onChange={(e) => setNewTokenName(e.target.value)}
                          placeholder="e.g. CI pipeline, Work laptop"
                          aria-label="Token name"
                          className={inputClasses}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={creatingToken || !newTokenName.trim()}
                        className="shrink-0 bg-accent text-white rounded-lg px-4 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {creatingToken ? 'Creating...' : 'Create token'}
                      </button>
                    </form>

                    {/* One-time token display */}
                    {createdToken && (
                      <div className="mt-4 bg-shipped-subtle rounded-xl p-4">
                        <p className="text-[12px] font-medium text-shipped mb-3">
                          Token created &mdash; copy it now. It won&apos;t be shown again.
                        </p>
                        <div className="flex items-center gap-3">
                          <code className="flex-1 font-mono text-[13px] text-ink bg-surface-elevated rounded-lg px-3 py-2 truncate select-all">
                            {createdToken}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="shrink-0 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Start */}
                  <div>
                    <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-4">
                      Quick Start
                    </h2>
                    <p className="text-[13px] text-ink-secondary mb-3">
                      Connect your Claude Code sessions with the{' '}
                      <code className="font-mono text-[12px] bg-surface-secondary px-1.5 py-0.5 rounded">
                        fyt-burn
                      </code>{' '}
                      CLI.
                    </p>
                    <ol className="font-mono text-[13px] text-ink-secondary space-y-1.5 list-decimal list-inside">
                      <li>npm install -g fyt-burn</li>
                      <li>fyt-burn login</li>
                      <li>fyt-burn install</li>
                      <li className="text-ink-tertiary">Done — sessions auto-report</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeSection === 'preferences' && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-5">
                    Location &amp; Availability
                  </h2>

                  <div>
                    <label
                      htmlFor="prefTimezone"
                      className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
                    >
                      Timezone
                    </label>
                    <select
                      id="prefTimezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className={selectClasses}
                    >
                      <option value="">Select timezone</option>
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
                      htmlFor="prefAvailability"
                      className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
                    >
                      Availability
                    </label>
                    <select
                      id="prefAvailability"
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

                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary !mt-8 mb-5">
                    Notifications
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-ink">Tribe invites</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifTribeInvites}
                        aria-label="Tribe invites"
                        onClick={() => setNotifTribeInvites(!notifTribeInvites)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                          notifTribeInvites ? 'bg-accent' : 'bg-surface-secondary'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                            notifTribeInvites ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-ink">Project updates</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifProjectUpdates}
                        aria-label="Project updates"
                        onClick={() => setNotifProjectUpdates(!notifProjectUpdates)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                          notifProjectUpdates ? 'bg-accent' : 'bg-surface-secondary'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                            notifProjectUpdates ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-ink">Weekly digest</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifWeeklyDigest}
                        aria-label="Weekly digest"
                        onClick={() => setNotifWeeklyDigest(!notifWeeklyDigest)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                          notifWeeklyDigest ? 'bg-accent' : 'bg-surface-secondary'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                            notifWeeklyDigest ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary !mt-8 mb-5">
                    Privacy
                  </h2>

                  <div>
                    <label
                      htmlFor="profileVisibility"
                      className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
                    >
                      Profile visibility
                    </label>
                    <select
                      id="profileVisibility"
                      value={profileVisibility}
                      onChange={(e) => setProfileVisibility(e.target.value)}
                      className={selectClasses}
                    >
                      <option value="public">Public</option>
                      <option value="tribe_only">Tribe only</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-ink">Show timezone</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showTimezone}
                        aria-label="Show timezone"
                        onClick={() => setShowTimezone(!showTimezone)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                          showTimezone ? 'bg-accent' : 'bg-surface-secondary'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                            showTimezone ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-ink">Show agent setup</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showAgentSetup}
                        aria-label="Show agent setup"
                        onClick={() => setShowAgentSetup(!showAgentSetup)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                          showAgentSetup ? 'bg-accent' : 'bg-surface-secondary'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                            showAgentSetup ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
