'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { GET_PROJECT } from '@/lib/graphql/queries/projects';
import type {
  GetProjectData,
  Project,
  Collaborator,
} from '@/lib/graphql/types';

/* ─── Helpers ─── */

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

function formatLinkLabel(key: string): string {
  const map: Record<string, string> = {
    github: 'GitHub',
    demo: 'Live Demo',
    website: 'Website',
    docs: 'Documentation',
    figma: 'Figma',
    productHunt: 'Product Hunt',
    video: 'Video',
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function formatMetricKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatMetricValue(value: unknown): string {
  if (typeof value === 'number') {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1_000) return Math.round(value / 1_000) + 'K';
    return String(value);
  }
  return String(value);
}

/* ─── Loading Skeleton ─── */

function ProjectSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16 animate-pulse"
      data-testid="project-skeleton"
    >
      <div className="pt-10 lg:pt-14 pb-8 lg:pb-10">
        {/* Status + title */}
        <div className="h-5 w-24 bg-surface-secondary rounded mb-4" />
        <div className="h-12 w-80 bg-surface-secondary rounded mb-3" />
        <div className="h-5 w-full max-w-lg bg-surface-secondary rounded mb-2" />
        <div className="h-5 w-3/4 max-w-md bg-surface-secondary rounded" />
      </div>

      {/* Owner card */}
      <div className="h-24 w-64 bg-surface-elevated rounded-xl shadow-xs mb-12" />

      {/* Details */}
      <div className="space-y-4">
        <div className="h-4 w-20 bg-surface-secondary rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-accent-subtle rounded-md" />
          <div className="h-6 w-20 bg-accent-subtle rounded-md" />
          <div className="h-6 w-14 bg-accent-subtle rounded-md" />
        </div>
      </div>
    </div>
  );
}

/* ─── Not Found ─── */

function ProjectNotFound() {
  return (
    <div className="mx-auto max-w-[1080px] px-6 py-24 text-center">
      <h1 className="font-serif text-4xl text-ink mb-3">Project not found</h1>
      <p className="text-ink-secondary">
        This project doesn&apos;t exist or may have been removed.
      </p>
    </div>
  );
}

/* ─── Person Card (shared for owner + collaborators) ─── */

function PersonCard({
  displayName,
  username,
  role,
  headline,
  badge,
}: {
  displayName: string;
  username: string;
  role: string | null;
  headline: string | null;
  badge?: string;
}) {
  return (
    <Link
      href={`/profile/${username}`}
      className="bg-surface-elevated rounded-xl shadow-xs p-5 flex items-start gap-4 card-lift"
    >
      {/* Avatar initial */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-subtle to-accent-muted shrink-0">
        <span className="font-serif text-[16px] text-accent">
          {getInitials(displayName)}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[15px] text-ink truncate">
            {displayName}
          </span>
          {badge && (
            <span className="font-mono text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded-md shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[13px] text-ink-tertiary mt-0.5">
          @{username}
          {role ? ` \u00b7 ${formatRole(role)}` : ''}
        </p>
        {headline && (
          <p className="text-[13px] text-ink-secondary mt-1 line-clamp-1">
            {headline}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ─── Project Content ─── */

function ProjectContent({ project }: { project: Project }) {
  const owner = project.owner;
  const collaborators = (project.collaborators || []).filter(
    (c) => c.user.id !== owner?.id
  );
  const techStack = project.techStack || [];
  const links = project.links || {};
  const linkEntries = Object.entries(links).filter(([, url]) => url);
  const impactEntries = Object.entries(project.impactMetrics || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  const hasDetails = techStack.length > 0 || linkEntries.length > 0 || impactEntries.length > 0;

  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16">
      {/* ─── HERO SECTION ─── */}
      <section className="pt-10 lg:pt-14 pb-8 lg:pb-10">
        {/* Status badge */}
        <div className="mb-4">
          {project.status === 'SHIPPED' ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] bg-shipped-subtle text-shipped px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-shipped" />
              Shipped
            </span>
          ) : project.status === 'IN_PROGRESS' ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] bg-in-progress-subtle text-in-progress px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-in-progress animate-pulse" />
              In Progress
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] bg-surface-secondary text-ink-tertiary px-3 py-1 rounded-full">
              Archived
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.01em] mb-3">
          {project.title}
        </h1>

        {/* Description */}
        {project.description && (
          <p className="text-[16px] text-ink-secondary leading-[1.65] max-w-2xl">
            {project.description}
          </p>
        )}

        {/* GitHub stars + dates */}
        <div className="flex items-center gap-4 mt-4">
          {project.githubStars !== null && project.githubStars > 0 && (
            <span className="font-mono text-[12px] text-ink-tertiary">
              {project.githubStars.toLocaleString()} stars
            </span>
          )}
          <span className="text-[12px] text-ink-tertiary">
            Started {formatDate(project.createdAt)}
          </span>
          {project.updatedAt !== project.createdAt && (
            <span className="text-[12px] text-ink-tertiary">
              Updated {formatDate(project.updatedAt)}
            </span>
          )}
        </div>
      </section>

      {/* ─── OWNER ─── */}
      {owner && (
        <section className="mb-12">
          <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
            Created By
          </div>
          <div className="max-w-xs">
            <PersonCard
              displayName={owner.displayName}
              username={owner.username}
              role={owner.primaryRole}
              headline={owner.headline}
            />
          </div>
        </section>
      )}

      {/* ─── DETAILS ─── */}
      {hasDetails && (
        <section className="mb-12">
          <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
            Details
          </div>

          <div className="space-y-8">
            {/* Tech stack */}
            {techStack.length > 0 && (
              <div>
                <h3 className="text-[13px] font-medium text-ink-secondary mb-3">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="font-mono text-[11px] bg-accent-subtle text-accent px-2.5 py-0.5 rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {linkEntries.length > 0 && (
              <div>
                <h3 className="text-[13px] font-medium text-ink-secondary mb-3">
                  Links
                </h3>
                <div className="flex flex-col gap-2">
                  {linkEntries.map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[14px] text-accent hover:text-accent-hover transition-colors w-fit"
                    >
                      <span className="font-medium">{formatLinkLabel(key)}</span>
                      <span className="text-ink-tertiary text-[12px]">&rarr;</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Impact metrics */}
            {impactEntries.length > 0 && (
              <div>
                <h3 className="text-[13px] font-medium text-ink-secondary mb-3">
                  Impact
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {impactEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-surface-secondary rounded-xl p-4"
                    >
                      <span className="block font-mono text-[20px] font-medium text-ink mb-1">
                        {formatMetricValue(value)}
                      </span>
                      <span className="text-[12px] text-ink-tertiary">
                        {formatMetricKey(key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── COLLABORATORS ─── */}
      {collaborators.length > 0 && (
        <section className="mb-12">
          <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
            Collaborators
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collaborators.map((collab: Collaborator) => (
              <PersonCard
                key={collab.user.id}
                displayName={collab.user.displayName}
                username={collab.user.username}
                role={collab.role}
                headline={collab.user.headline}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, loading, error } = useQuery<GetProjectData>(GET_PROJECT, {
    variables: { id },
    skip: !id,
  });

  if (loading) return <ProjectSkeleton />;
  if (error || !data?.project) return <ProjectNotFound />;

  return <ProjectContent project={data.project} />;
}
