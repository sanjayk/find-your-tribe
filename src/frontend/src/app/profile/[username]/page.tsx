'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';

import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import type {
  GetBuilderData,
  Builder,
  AvailabilityStatus,
  AgentWorkflowStyle,
  Project,
} from '@/lib/graphql/types';
import { BurnHeatmap, type BurnDay } from '@/components/features/burn-heatmap';
import { AgentPanel, type AgentTool } from '@/components/features/agent-panel';
import { ProofCard } from '@/components/features/proof-card';
import type { BurnReceiptProps } from '@/components/features/burn-receipt';
import { WitnessCredits, type Witness } from '@/components/features/witness-credits';
import { ProfileFooter, type TribeItem, type LinkItem, type InfoItem } from '@/components/features/profile-footer';
import { DomainTags } from '@/components/features/domain-tags';

/* ─── Helpers ─── */

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFirstInitial(displayName: string): string {
  return displayName.trim()[0].toUpperCase();
}

function getWitnessTitle(headline: string | null, primaryRole: string | null): string {
  if (headline) {
    const short = headline.split(/\s*[—–]\s*/)[0].trim();
    if (short.length <= 30) return short;
  }
  return formatRole(primaryRole) || 'Builder';
}

function formatTimezone(tz: string): string {
  try {
    const now = new Date();
    const shortFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' });
    const abbr = shortFmt.formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
    const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    const gmtOffset = offsetFmt.formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
    const utcOffset = gmtOffset.replace('GMT', 'UTC').replace(':00', '');
    return `${abbr} \u00b7 ${utcOffset}`;
  } catch {
    return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  }
}

function mapAvailabilityLabel(status: AvailabilityStatus): string {
  const map: Record<AvailabilityStatus, string> = {
    OPEN_TO_TRIBE: 'Open to tribe',
    AVAILABLE_FOR_PROJECTS: 'Available for projects',
    JUST_BROWSING: 'Just browsing',
  };
  return map[status];
}

function isAvailable(status: AvailabilityStatus): boolean {
  return status === 'OPEN_TO_TRIBE' || status === 'AVAILABLE_FOR_PROJECTS';
}

const WORKFLOW_LABELS: Record<AgentWorkflowStyle, string> = {
  PAIR: 'Pair builder',
  SWARM: 'Swarm delegation',
  REVIEW: 'AI review',
  AUTONOMOUS: 'Autonomous agents',
  MINIMAL: 'Minimal AI',
};

function formatRole(role: string | null): string {
  if (!role) return '';
  const map: Record<string, string> = {
    ENGINEER: 'Engineer',
    DESIGNER: 'Designer',
    PM: 'Product Manager',
    MARKETER: 'Marketer',
    GROWTH: 'Growth',
    FOUNDER: 'Founder',
    OTHER: 'Builder',
  };
  return map[role] || role;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

/* ─── Mock Burn Data (TODO: replace with real GraphQL burn_summary query) ─── */

const BURN_PATTERNS: Record<string, 'heavy' | 'moderate' | 'sporadic' | 'new' | 'dormant'> = {
  mayachen: 'heavy',
  sarahkim: 'heavy',
  tomnakamura: 'moderate',
  priyasharma: 'moderate',
  marcusjohnson: 'sporadic',
  elenavolkov: 'sporadic',
  jamesokafor: 'new',
  davidmorales: 'new',
  alexrivera: 'dormant',
  aishapatel: 'dormant',
};

const PATTERN_CONFIG: Record<string, { weekdayRange: [number, number]; weekendRange: [number, number]; activeProbability: number; spikeWeeks: number[] }> = {
  heavy: { weekdayRange: [8000, 60000], weekendRange: [2000, 20000], activeProbability: 0.75, spikeWeeks: [8, 20, 35, 48] },
  moderate: { weekdayRange: [4000, 30000], weekendRange: [1000, 10000], activeProbability: 0.55, spikeWeeks: [15, 30, 45] },
  sporadic: { weekdayRange: [2000, 15000], weekendRange: [500, 5000], activeProbability: 0.35, spikeWeeks: [12, 38] },
  new: { weekdayRange: [1000, 12000], weekendRange: [500, 4000], activeProbability: 0.2, spikeWeeks: [48, 50] },
  dormant: { weekdayRange: [500, 3000], weekendRange: [0, 1000], activeProbability: 0.08, spikeWeeks: [] },
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockBurnData(username: string): { dailyActivity: BurnDay[]; weeklyBuckets: number[] } {
  const pattern = BURN_PATTERNS[username] || 'dormant';
  const config = PATTERN_CONFIG[pattern];
  let seed = 0;
  for (const ch of username) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const rand = seededRandom(Math.abs(seed) + 1);

  const dailyActivity: BurnDay[] = [];
  const weeklyBuckets: number[] = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 364);

  for (let w = 0; w < 52; w++) {
    let weekTotal = 0;
    const isSpikeWeek = config.spikeWeeks.includes(w);
    for (let d = 0; d < 7; d++) {
      const dayIndex = w * 7 + d;
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayIndex);
      const iso = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const prob = isSpikeWeek ? Math.min(config.activeProbability * 1.5, 0.95) : config.activeProbability;
      if (rand() > prob) {
        dailyActivity.push({ date: iso, tokens: 0 });
        continue;
      }

      const [lo, hi] = isWeekend ? config.weekendRange : config.weekdayRange;
      const multiplier = isSpikeWeek ? 1.8 : 1;
      const tokens = Math.round((lo + rand() * (hi - lo)) * multiplier);
      dailyActivity.push({ date: iso, tokens });
      weekTotal += tokens;
    }
    weeklyBuckets.push(weekTotal);
  }

  return { dailyActivity, weeklyBuckets };
}

/* ─── Domain Tags (derived from skills categories) ─── */

const CATEGORY_DOMAINS: Record<string, string> = {
  ENGINEERING: 'Engineering',
  DESIGN: 'Design',
  PRODUCT: 'Product',
  MARKETING: 'Marketing',
  GROWTH: 'Growth',
  DATA: 'Data & ML',
  OPERATIONS: 'Infrastructure',
};

function deriveDomains(builder: Builder): string[] {
  const categories = new Set(builder.skills.map((s) => s.category));
  return Array.from(categories)
    .map((c) => CATEGORY_DOMAINS[c])
    .filter(Boolean)
    .slice(0, 4);
}

/* ─── Agent tools mapping ─── */

const AGENT_TOOL_CAPABILITIES: Record<string, string> = {
  'Claude Code': 'backend, testing',
  'Claude': 'backend, testing',
  'Cursor': 'frontend, full-stack',
  'v0': 'UI prototyping',
  'GitHub Copilot': 'autocomplete',
  'Windsurf': 'full-stack',
  'Devin': 'autonomous tasks',
};

function mapAgentTools(tools: string[]): AgentTool[] {
  return tools.map((name) => ({
    name,
    capabilities: AGENT_TOOL_CAPABILITIES[name] || '',
  }));
}

/* ─── Witness extraction ─── */

function extractWitnesses(builder: Builder): Witness[] {
  const witnessMap = new Map<string, Witness>();

  for (const project of builder.projects) {
    for (const collab of project.collaborators || []) {
      if (collab.user.username === builder.username) continue;

      const existing = witnessMap.get(collab.user.username);
      if (existing) {
        existing.projects.push({
          name: project.title,
          role: collab.role || 'contributor',
        });
      } else {
        witnessMap.set(collab.user.username, {
          initials: getInitials(collab.user.displayName),
          name: collab.user.displayName,
          role: getWitnessTitle(collab.user.headline ?? null, collab.user.primaryRole ?? null),
          projects: [{ name: project.title, role: collab.role || 'contributor' }],
        });
      }
    }
  }

  return Array.from(witnessMap.values());
}

/* ─── Footer data extraction ─── */

function extractFooterData(builder: Builder): {
  tribes: TribeItem[];
  links: LinkItem[];
  info: InfoItem[];
} {
  const tribes: TribeItem[] = (builder.tribes || []).map((t) => ({
    name: t.name,
    memberCount: t.members.length,
  }));

  const links: LinkItem[] = [];
  if (builder.githubUsername) {
    links.push({
      label: 'GitHub',
      value: `@${builder.githubUsername}`,
      href: `https://github.com/${builder.githubUsername}`,
    });
  }
  const contactLinks = builder.contactLinks || {};
  if (contactLinks.twitter) {
    const handle = contactLinks.twitter.replace(/^https?:\/\/(www\.)?twitter\.com\//, '').replace(/^@/, '');
    links.push({
      label: 'Twitter',
      value: `@${handle}`,
      href: contactLinks.twitter.startsWith('http') ? contactLinks.twitter : `https://twitter.com/${handle}`,
    });
  }
  if (contactLinks.website) {
    links.push({
      label: 'Website',
      value: contactLinks.website.replace(/^https?:\/\//, ''),
      href: contactLinks.website.startsWith('http') ? contactLinks.website : `https://${contactLinks.website}`,
    });
  }

  const info: InfoItem[] = [];
  if (builder.timezone) {
    info.push({ label: 'Timezone', value: formatTimezone(builder.timezone) });
  }
  if (builder.primaryRole) {
    info.push({ label: 'Primary role', value: formatRole(builder.primaryRole) });
  }
  info.push({ label: 'Joined', value: formatDate(builder.createdAt) });

  return { tribes, links, info };
}

/* ─── Proof card data ─── */

function makeReceiptProps(weeklyBuckets: number[], _project: Project): BurnReceiptProps {
  // Slice the weekly data to approximate project duration
  const totalTokens = weeklyBuckets.reduce((a, b) => a + b, 0);
  const activeWeeks = weeklyBuckets.filter((w) => w > 0).length;
  const peakWeek = Math.max(...weeklyBuckets, 0);

  return {
    weeklyData: weeklyBuckets.slice(-Math.min(activeWeeks, 20)),
    duration: `${activeWeeks} weeks`,
    tokens: formatTokens(Math.round(totalTokens * 0.4)), // rough per-project share
    peakWeek: formatTokens(peakWeek),
  };
}

function makeBurnStat(weeklyBuckets: number[], projectIndex: number): string {
  const weights = [0.35, 0.25, 0.18, 0.12, 0.08, 0.06];
  const share = weights[projectIndex % weights.length] || 0.1;
  const total = weeklyBuckets.reduce((a, b) => a + b, 0);
  const activeWeeks = weeklyBuckets.filter((w) => w > 0).length;
  const projWeeks = Math.max(6, Math.round(activeWeeks * (0.35 - projectIndex * 0.06)));
  return `${formatTokens(Math.round(total * share))} \u00b7 ${projWeeks} wks`;
}

function makeSparklineData(weeklyBuckets: number[], projectIndex: number): number[] {
  const offset = (projectIndex * 8) % Math.max(1, weeklyBuckets.length - 12);
  return weeklyBuckets.slice(offset, offset + 12);
}

/* ─── Loading Skeleton ─── */

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16 animate-pulse" data-testid="profile-skeleton">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 pt-10 lg:pt-14 pb-8 lg:pb-10">
        <div className="space-y-4">
          <div className="w-[88px] h-[88px] rounded-full bg-surface-secondary" />
          <div className="h-12 w-48 bg-surface-secondary rounded" />
          <div className="h-4 w-28 bg-surface-secondary rounded" />
          <div className="h-16 w-full bg-surface-secondary rounded" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-48 w-full bg-surface-elevated rounded-2xl" />
          <div className="h-14 w-full bg-accent-subtle rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Not Found ─── */

function ProfileNotFound({ username }: { username: string }) {
  return (
    <div className="mx-auto max-w-[1080px] px-6 py-24 text-center">
      <h1 className="font-serif text-4xl text-ink mb-3">Builder not found</h1>
      <p className="text-ink-secondary">
        No builder with username <span className="font-mono text-ink">@{username}</span> exists.
      </p>
    </div>
  );
}

/* ─── Profile Content ─── */

function ProfileContent({ builder }: { builder: Builder }) {
  const availability = mapAvailabilityLabel(builder.availabilityStatus);
  const available = isAvailable(builder.availabilityStatus);

  // Burn data (mock until real query available)
  const { dailyActivity, weeklyBuckets } = generateMockBurnData(builder.username);
  const totalTokens = dailyActivity.reduce((sum, d) => sum + d.tokens, 0);
  const daysActive = dailyActivity.filter((d) => d.tokens > 0).length;
  const activeWeeks = weeklyBuckets.filter((w) => w > 0).length;
  const shippedCount = builder.projects.filter((p) => p.status === 'SHIPPED').length;
  const totalProjects = builder.projects.length;

  // Split projects
  const inProgress = builder.projects.filter((p) => p.status === 'IN_PROGRESS');
  const shipped = builder.projects.filter((p) => p.status === 'SHIPPED');
  const heroProject = inProgress[0] || shipped[0];
  const compactProjects = heroProject
    ? builder.projects.filter((p) => p.id !== heroProject.id).slice(0, 6)
    : [];

  // Agent panel data
  const agentTools = mapAgentTools(builder.agentTools || []);
  const workflowStyle = builder.agentWorkflowStyle
    ? WORKFLOW_LABELS[builder.agentWorkflowStyle]
    : 'Pair builder';
  const humanRatio = builder.humanAgentRatio !== null && builder.humanAgentRatio !== undefined
    ? Math.round(builder.humanAgentRatio * 100)
    : 50;

  // Domain tags
  const domains = deriveDomains(builder);

  // Witnesses
  const witnesses = extractWitnesses(builder);

  // Footer
  const footerData = extractFooterData(builder);

  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16">
      {/* ─── HERO SECTION ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 items-start pt-10 lg:pt-14 pb-8 lg:pb-10">
        {/* Left: Identity */}
        <div>
          {/* Avatar */}
          <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center bg-gradient-to-br from-accent-subtle to-accent-muted mb-4">
            <span className="font-serif text-[36px] text-accent">
              {getFirstInitial(builder.displayName)}
            </span>
          </div>

          {/* Name */}
          <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.01em]">
            {builder.displayName}
          </h1>

          {/* Handle */}
          <p className="text-[14px] text-ink-tertiary mt-1">
            @{builder.username}
          </p>

          {/* Headline */}
          {builder.headline && (
            <p className="text-[15px] text-ink-secondary leading-[1.6] mt-3">
              {builder.headline}
            </p>
          )}

          {/* Availability badge */}
          <div className="flex flex-col gap-2.5 mt-4">
            <span
              className={`inline-flex items-center font-medium text-[13px] gap-1.5 py-[5px] px-3 rounded-full ${
                available
                  ? 'bg-shipped-subtle text-shipped'
                  : 'bg-surface-secondary text-ink-tertiary'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-shipped' : 'bg-ink-tertiary'}`} />
              {availability}
            </span>
          </div>

          {/* Domain tags */}
          {domains.length > 0 && <DomainTags domains={domains} />}
        </div>

        {/* Right: Burn + Agent Panel */}
        <div className="flex flex-col gap-3">
          <BurnHeatmap
            dailyActivity={dailyActivity}
            stats={{
              daysActive,
              totalTokens: formatTokens(totalTokens),
              activeWeeks: `${activeWeeks} / 52`,
              shipped: `${shippedCount} / ${totalProjects}`,
            }}
          />
          {agentTools.length > 0 && (
            <AgentPanel
              tools={agentTools}
              workflowStyle={workflowStyle}
              humanRatio={humanRatio}
            />
          )}
        </div>
      </section>

      {/* ─── PROOF OF WORK ─── */}
      {builder.projects.length > 0 && (
        <section className="mt-3">
          <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
            Proof of Work
          </div>

          {/* Hero card */}
          {heroProject && (
            <div className="mb-5">
              <ProofCard
                variant="hero"
                title={heroProject.title}
                description={heroProject.description || ''}
                status={heroProject.status === 'SHIPPED' ? 'shipped' : 'in_progress'}
                agentTools={builder.agentTools}
                builders={(heroProject.collaborators || [])
                  .filter((c) => c.user.username !== builder.username)
                  .slice(0, 5)
                  .map((c) => ({
                    initials: getInitials(c.user.displayName),
                    name: c.user.displayName,
                  }))}
                receipt={makeReceiptProps(weeklyBuckets, heroProject)}
              />
            </div>
          )}

          {/* Compact grid */}
          {compactProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
              {compactProjects.map((project, idx) => (
                <ProofCard
                  key={project.id}
                  variant="compact"
                  title={project.title}
                  description={project.description || ''}
                  status={project.status === 'SHIPPED' ? 'shipped' : 'in_progress'}
                  sparklineData={makeSparklineData(weeklyBuckets, idx + 1)}
                  burnStat={makeBurnStat(weeklyBuckets, idx + 1)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {builder.projects.length === 0 && (
        <section className="mt-3">
          <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
            Proof of Work
          </div>
          <div className="rounded-xl bg-surface-secondary p-12 text-center">
            <p className="text-[15px] text-ink-tertiary">No projects yet.</p>
          </div>
        </section>
      )}

      {/* ─── WITNESSED BY ─── */}
      {witnesses.length > 0 && (
        <section className="mt-14">
          <WitnessCredits witnesses={witnesses} />
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <div className="mt-14">
        <ProfileFooter
          tribes={footerData.tribes}
          links={footerData.links}
          info={footerData.info}
        />
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const { data, loading, error } = useQuery<GetBuilderData>(GET_BUILDER, {
    variables: { username },
    skip: !username,
  });

  if (loading) return <ProfileSkeleton />;
  if (error) return <ProfileNotFound username={username} />;
  if (!data?.user) return <ProfileNotFound username={username} />;

  return <ProfileContent builder={data.user} />;
}
