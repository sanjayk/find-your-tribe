'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { Github, Globe, MapPin, Calendar, Twitter, Linkedin } from 'lucide-react';

import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import type { GetBuilderData, Builder, AvailabilityStatus, ProjectStatus, AgentWorkflowStyle } from '@/lib/graphql/types';
import { ScoreDisplay } from '@/components/features/score-display';
import { ProjectCard } from '@/components/features/project-card';
import { BurnMapDotGrid, generateMockBurnData } from '@/components/features/burn-map';

/* ─── Mock burn patterns per user (until real token data exists) ─── */
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

/* ─── Helpers ─── */

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'bg-[#e8ddd3]', text: 'text-[#6b4c3b]' },
  { bg: 'bg-[#dde0d5]', text: 'text-[#4a5240]' },
  { bg: 'bg-[#e2d5cd]', text: 'text-[#7a5a4a]' },
  { bg: 'bg-[#d9d5d0]', text: 'text-[#5c5650]' },
  { bg: 'bg-[#e0d3d0]', text: 'text-[#7a5555]' },
  { bg: 'bg-[#dfd8c8]', text: 'text-[#6b5e3e]' },
];

function getAvatarColor(username: string) {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function mapAvailabilityStatus(status: AvailabilityStatus) {
  const map: Record<AvailabilityStatus, { label: string; dotColor: string }> = {
    OPEN_TO_TRIBE: { label: 'Open to tribe', dotColor: 'bg-shipped' },
    AVAILABLE_FOR_PROJECTS: { label: 'Available for projects', dotColor: 'bg-shipped' },
    JUST_BROWSING: { label: 'Just browsing', dotColor: 'bg-ink-tertiary' },
  };
  return map[status];
}

function mapProjectStatus(status: ProjectStatus): 'shipped' | 'in-progress' {
  return status === 'SHIPPED' ? 'shipped' : 'in-progress';
}

const WORKFLOW_LABELS: Record<AgentWorkflowStyle, string> = {
  PAIR: 'Pair programming',
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

const WORKFLOW_DESCRIPTIONS: Record<AgentWorkflowStyle, string> = {
  PAIR: 'Builds as a pair with AI',
  SWARM: 'Delegates to AI swarms',
  REVIEW: 'Uses AI for code review',
  AUTONOMOUS: 'Runs autonomous AI agents',
  MINIMAL: 'Minimal AI assistance',
};

function getWorkflowLabel(style: AgentWorkflowStyle): string {
  return WORKFLOW_LABELS[style] || style;
}

/* ─── Burn Stats ─── */

const BURN_STATS: Record<string, { tokens: string; streak: string; thisWeek: string }> = {
  heavy: { tokens: '2.4M', streak: '18', thisWeek: '62K' },
  moderate: { tokens: '1.1M', streak: '12', thisWeek: '18K' },
  sporadic: { tokens: '480K', streak: '4', thisWeek: '11K' },
  new: { tokens: '120K', streak: '3', thisWeek: '24K' },
  dormant: { tokens: '12K', streak: '0', thisWeek: '—' },
};

function BurnStats({ pattern }: { pattern: string }) {
  const stats = BURN_STATS[pattern] || BURN_STATS.dormant;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[20px] font-medium text-accent">{stats.tokens}</span>
        <span className="text-[11px] text-ink-tertiary">burned</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[14px] font-medium text-ink">{stats.streak}</span>
        <span className="text-[11px] text-ink-tertiary">week streak</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[14px] font-medium text-ink">{stats.thisWeek}</span>
        <span className="text-[11px] text-ink-tertiary">this week</span>
      </div>
    </div>
  );
}

/* ─── Timezone Display ─── */

function TimezoneDisplay({ timezone }: { timezone: string }) {
  try {
    const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const viewerOffset = getTimezoneOffset(now, viewerTz);
    const builderOffset = getTimezoneOffset(now, timezone);
    const diffHours = Math.abs(viewerOffset - builderOffset) / 60;
    const overlapHours = Math.max(0, 9 - diffHours);
    const overlapText = viewerTz === timezone
      ? null
      : overlapHours > 0
        ? `${Math.round(overlapHours)}hrs overlap`
        : 'No overlap';

    return (
      <div>
        <span className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
          <MapPin className="w-4 h-4 text-ink-tertiary" />
          {timezone.split('/').pop()?.replace(/_/g, ' ')}
        </span>
        {overlapText && (
          <span className="text-[11px] text-ink-tertiary pl-6">{overlapText}</span>
        )}
      </div>
    );
  } catch {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
        <MapPin className="w-4 h-4 text-ink-tertiary" />
        {timezone}
      </span>
    );
  }
}

function getTimezoneOffset(date: Date, tz: string): number {
  const str = date.toLocaleString('en-US', { timeZone: tz });
  const localDate = new Date(str);
  return (localDate.getTime() - date.getTime()) / 60000;
}

/* ─── Bio with expand/collapse ─── */

function ExpandableBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 200;

  return (
    <div>
      <p className={`text-[15px] leading-relaxed text-ink ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
        {bio}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[13px] text-accent hover:text-accent-hover transition-colors mt-1"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/* ─── Loading Skeleton ─── */

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px] px-6 py-16 animate-pulse">
      <div className="flex gap-12">
        <div className="w-[320px] shrink-0 space-y-5">
          <div className="w-[88px] h-[88px] rounded-full bg-surface-secondary" />
          <div className="h-10 w-48 bg-surface-secondary rounded" />
          <div className="h-5 w-32 bg-surface-secondary rounded" />
          <div className="h-16 w-16 rounded-full bg-surface-secondary" />
          <div className="h-20 w-full bg-surface-secondary rounded" />
          <div className="h-12 w-full bg-surface-secondary rounded" />
        </div>
        <div className="flex-1 space-y-6">
          <div className="h-48 w-full bg-surface-secondary rounded-xl" />
          <div className="h-12 w-64 bg-surface-secondary rounded" />
          <div className="grid grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 bg-surface-secondary rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Not Found ─── */

function ProfileNotFound({ username }: { username: string }) {
  return (
    <div className="mx-auto max-w-[1120px] px-6 py-24 text-center">
      <h1 className="font-serif text-4xl text-ink mb-3">Builder not found</h1>
      <p className="text-ink-secondary">
        No builder with username <span className="font-mono text-ink">@{username}</span> exists.
      </p>
    </div>
  );
}

/* ─── Profile Content ─── */

function ProfileContent({ builder }: { builder: Builder }) {
  const avatar = getAvatarColor(builder.username);
  const availability = mapAvailabilityStatus(builder.availabilityStatus);
  const contactLinks = builder.contactLinks as Record<string, string>;

  const inProgress = builder.projects.filter((p) => p.status === 'IN_PROGRESS');
  const shipped = builder.projects.filter((p) => p.status === 'SHIPPED');

  const burnPattern = BURN_PATTERNS[builder.username] || 'dormant';

  // Aggregate impact
  const totalStars = builder.projects.reduce((sum, p) => sum + (p.githubStars || 0), 0);
  const shippedCount = shipped.length;
  const totalUsers = builder.projects.reduce((sum, p) => {
    const users = p.impactMetrics?.users;
    return sum + (typeof users === 'number' ? users : 0);
  }, 0);

  // Built With — deduplicate collaborators and count shared projects
  const collabMap = new Map<string, {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    projectCount: number;
  }>();
  for (const project of builder.projects) {
    for (const c of project.collaborators || []) {
      if (c.user.username === builder.username) continue;
      const existing = collabMap.get(c.user.username);
      if (existing) {
        existing.projectCount++;
      } else {
        collabMap.set(c.user.username, {
          username: c.user.username,
          displayName: c.user.displayName,
          avatarUrl: c.user.avatarUrl,
          projectCount: 1,
        });
      }
    }
  }
  const builtWithList = Array.from(collabMap.values()).sort(
    (a, b) => b.projectCount - a.projectCount,
  );

  // Agent workflow data
  const agentTools = builder.agentTools || [];
  const hasAgentData = agentTools.length > 0 || builder.agentWorkflowStyle || builder.humanAgentRatio !== null;

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-16">
      <div className="flex gap-12">
        {/* ─── SIDEBAR (320px, sticky) ─── */}
        <aside className="w-[320px] shrink-0">
          <div className="sticky top-20 space-y-5">
            {/* Avatar */}
            {builder.avatarUrl ? (
              <img
                src={builder.avatarUrl}
                alt={builder.displayName}
                className={`w-[88px] h-[88px] rounded-full object-cover ${avatar.bg}`}
              />
            ) : (
              <div
                className={`w-[88px] h-[88px] rounded-full flex items-center justify-center ${avatar.bg} ${avatar.text}`}
              >
                <span className="text-2xl font-medium">
                  {getInitials(builder.displayName)}
                </span>
              </div>
            )}

            {/* Name */}
            <h1 className="font-serif text-[40px] leading-tight text-ink">
              {builder.displayName}
            </h1>

            {/* Handle */}
            <p className="text-[13px] text-ink-tertiary">@{builder.username}</p>

            {/* Role + availability */}
            <div>
              {builder.primaryRole && (
                <p className="text-[16px] font-semibold text-ink-secondary">
                  {formatRole(builder.primaryRole)}
                </p>
              )}
              <span className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${availability.dotColor}`} />
                <span className="text-[13px] text-ink-secondary">{availability.label}</span>
              </span>
            </div>

            {/* Builder Score */}
            <ScoreDisplay score={builder.builderScore} variant="profile" />

            <div className="h-px bg-surface-secondary" />

            {/* Bio */}
            {builder.bio && <ExpandableBio bio={builder.bio} />}

            <div className="h-px bg-surface-secondary" />

            {/* How They Build — AI Workflow */}
            {hasAgentData && (
              <div className="space-y-3">
                <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase">
                  How They Build
                </p>

                {/* Workflow description */}
                {builder.agentWorkflowStyle && (
                  <p className="text-[14px] text-ink-secondary">
                    {WORKFLOW_DESCRIPTIONS[builder.agentWorkflowStyle]}
                  </p>
                )}

                {/* AI tools */}
                {agentTools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {agentTools.map((tool) => (
                      <span
                        key={tool}
                        className="font-mono text-[11px] bg-accent-subtle text-accent px-2.5 py-1 rounded-md"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}

                {/* Human / AI ratio */}
                {builder.humanAgentRatio !== null && builder.humanAgentRatio !== undefined && (
                  <div className="space-y-1">
                    <div className="flex h-2 rounded-full overflow-hidden bg-surface-secondary">
                      <div
                        className="h-full bg-[#a08870] rounded-l-full"
                        style={{ width: `${builder.humanAgentRatio * 100}%` }}
                      />
                      <div
                        className="h-full bg-accent-muted rounded-r-full flex-1"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-ink-tertiary font-mono">
                      <span>{Math.round(builder.humanAgentRatio * 100)}% human</span>
                      <span>{Math.round((1 - builder.humanAgentRatio) * 100)}% AI</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Skills — demoted, compact */}
            {builder.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {builder.skills.slice(0, 8).map((s) => (
                  <span
                    key={s.id}
                    className="font-mono text-[10px] bg-surface-secondary text-ink-tertiary px-2 py-0.5 rounded"
                  >
                    {s.name}
                  </span>
                ))}
                {builder.skills.length > 8 && (
                  <span className="text-[10px] text-ink-tertiary">
                    +{builder.skills.length - 8}
                  </span>
                )}
              </div>
            )}

            <div className="h-px bg-surface-secondary" />

            {/* Timezone */}
            {builder.timezone && <TimezoneDisplay timezone={builder.timezone} />}

            {/* Links */}
            <div className="space-y-1.5">
              {builder.githubUsername && (
                <a href={`https://github.com/${builder.githubUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-accent hover:text-accent-hover transition-colors">
                  <Github className="w-4 h-4 text-ink-tertiary" />
                  GitHub
                </a>
              )}
              {contactLinks.twitter && (
                <a href={contactLinks.twitter.startsWith('http') ? contactLinks.twitter : `https://twitter.com/${contactLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-accent hover:text-accent-hover transition-colors">
                  <Twitter className="w-4 h-4 text-ink-tertiary" />
                  Twitter
                </a>
              )}
              {contactLinks.linkedin && (
                <a href={contactLinks.linkedin.startsWith('http') ? contactLinks.linkedin : `https://linkedin.com/in/${contactLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-accent hover:text-accent-hover transition-colors">
                  <Linkedin className="w-4 h-4 text-ink-tertiary" />
                  LinkedIn
                </a>
              )}
              {contactLinks.website && (
                <a href={contactLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-accent hover:text-accent-hover transition-colors">
                  <Globe className="w-4 h-4 text-ink-tertiary" />
                  Website
                </a>
              )}
            </div>

            {/* Joined */}
            <div className="flex items-center gap-2 text-[13px] text-ink-tertiary">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDate(builder.createdAt)}</span>
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT (fluid) ─── */}
        <main className="flex-1 min-w-0 space-y-12">
          {/* ─── Token Burn (top of right column) ─── */}
          <section>
            <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase mb-6">
              Token Burn
            </p>
            <div className="bg-surface-elevated rounded-xl p-6 shadow-sm space-y-5">
              <BurnMapDotGrid data={generateMockBurnData(burnPattern)} />
              <BurnStats pattern={burnPattern} />
            </div>
          </section>

          {/* ─── Aggregate Impact ─── */}
          {(totalStars > 0 || shippedCount > 0 || totalUsers > 0) && (
            <div className="flex items-baseline gap-3 flex-wrap">
              {totalStars > 0 && (
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[24px] font-medium text-ink">{totalStars.toLocaleString()}</span>
                  <span className="text-[13px] text-ink-tertiary">stars</span>
                </span>
              )}
              {totalStars > 0 && shippedCount > 0 && <span className="text-ink-tertiary">&middot;</span>}
              {shippedCount > 0 && (
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[24px] font-medium text-ink">{shippedCount}</span>
                  <span className="text-[13px] text-ink-tertiary">shipped</span>
                </span>
              )}
              {(totalStars > 0 || shippedCount > 0) && totalUsers > 0 && <span className="text-ink-tertiary">&middot;</span>}
              {totalUsers > 0 && (
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[24px] font-medium text-ink">{totalUsers.toLocaleString()}</span>
                  <span className="text-[13px] text-ink-tertiary">users</span>
                </span>
              )}
            </div>
          )}

          {/* ─── Currently Building ─── */}
          {inProgress.length > 0 && (
            <section>
              <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase mb-6">
                Currently Building
              </p>
              <div className="space-y-5">
                {inProgress.map((project) => (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    description={project.description || ''}
                    status={mapProjectStatus(project.status)}
                    role={project.role || undefined}
                    agentTools={builder.agentTools}
                    workflowStyle={builder.agentWorkflowStyle ? getWorkflowLabel(builder.agentWorkflowStyle) : undefined}
                    techStack={Array.isArray(project.techStack) ? project.techStack : []}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── Built With (social graph) ─── */}
          {builtWithList.length > 0 && (
            <section>
              <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase mb-6">
                Built With
              </p>
              <div className="space-y-3">
                {builtWithList.map((collab) => {
                  const collabAvatar = getAvatarColor(collab.username);
                  return (
                    <Link
                      key={collab.username}
                      href={`/profile/${collab.username}`}
                      className="flex items-center gap-3 group"
                    >
                      {collab.avatarUrl ? (
                        <img
                          src={collab.avatarUrl}
                          alt={collab.displayName}
                          className={`w-9 h-9 rounded-full object-cover ${collabAvatar.bg}`}
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${collabAvatar.bg} ${collabAvatar.text}`}
                        >
                          <span className="text-[11px] font-medium">
                            {getInitials(collab.displayName)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-ink group-hover:text-accent transition-colors">
                          {collab.displayName}
                        </p>
                        <p className="text-[11px] text-ink-tertiary">
                          {collab.projectCount} {collab.projectCount === 1 ? 'project' : 'projects'} together
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Tribes ─── */}
          {builder.tribes && builder.tribes.length > 0 && (
            <section>
              <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase mb-6">
                Tribes
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {builder.tribes.map((tribe) => {
                  const unfilledRoles = tribe.openRoles.filter((r) => !r.filled);
                  const isOpen = tribe.status === 'OPEN' || unfilledRoles.length > 0;

                  return (
                    <Link
                      key={tribe.id}
                      href={`/tribe/${tribe.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="bg-surface-elevated rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group"
                    >
                      {/* Status overline */}
                      <p className={`text-[10px] font-mono font-medium tracking-[0.08em] uppercase mb-2 ${isOpen ? 'text-accent' : 'text-ink-tertiary'}`}>
                        {isOpen ? 'Open Tribe' : 'Active Tribe'}
                      </p>

                      {/* Name */}
                      <h4 className="font-serif text-lg text-ink group-hover:text-accent transition-colors mb-1">
                        {tribe.name}
                      </h4>

                      {/* Mission */}
                      {tribe.mission && (
                        <p className="text-[13px] text-ink-secondary line-clamp-2 mb-3">
                          {tribe.mission}
                        </p>
                      )}

                      {/* Looking for roles */}
                      {unfilledRoles.length > 0 && (
                        <div className="bg-surface-secondary rounded-md px-3 py-2 mb-3">
                          <p className="text-[10px] text-ink-tertiary mb-1">Looking for:</p>
                          <p className="text-[12px] text-ink-secondary">
                            {unfilledRoles.map((r) => r.title).join(' · ')}
                          </p>
                        </div>
                      )}

                      {/* Members */}
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          {tribe.members.slice(0, 5).map((member) => {
                            const memberAvatar = getAvatarColor(member.user.username);
                            return member.user.avatarUrl ? (
                              <img
                                key={member.user.id}
                                src={member.user.avatarUrl}
                                alt={member.user.displayName}
                                className={`w-7 h-7 rounded-full object-cover ring-2 ring-surface-elevated ${memberAvatar.bg}`}
                              />
                            ) : (
                              <div
                                key={member.user.id}
                                className={`w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-surface-elevated ${memberAvatar.bg} ${memberAvatar.text}`}
                              >
                                <span className="text-[9px] font-medium">
                                  {getInitials(member.user.displayName)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-[11px] text-ink-tertiary">
                          {tribe.members.length}/{tribe.maxMembers} members
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Shipped Projects (end of right column) ─── */}
          {shipped.length > 0 && (
            <section>
              <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase mb-6">
                Shipped Projects
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {shipped.map((project) => (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    description={project.description || ''}
                    status={mapProjectStatus(project.status)}
                    role={project.role || undefined}
                    agentTools={builder.agentTools}
                    workflowStyle={builder.agentWorkflowStyle ? getWorkflowLabel(builder.agentWorkflowStyle) : undefined}
                    techStack={Array.isArray(project.techStack) ? project.techStack : []}
                  />
                ))}
              </div>
            </section>
          )}

          {builder.projects.length === 0 && (
            <div className="rounded-xl bg-surface-secondary p-12 text-center">
              <p className="text-[15px] text-ink-tertiary">No projects yet.</p>
            </div>
          )}
        </main>
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
