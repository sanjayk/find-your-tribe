'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client/react';

import { GET_BUILDERS } from '@/lib/graphql/queries/builders';
import type { GetBuildersData, Builder, AvailabilityStatus } from '@/lib/graphql/types';
import BuilderCard from '@/components/features/builder-card';

const PAGE_SIZE = 12;

/* ─── Helpers ─── */

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'bg-[#e8ddd3]', text: 'text-[#6b4c3b]' },  // warm sand
  { bg: 'bg-[#dde0d5]', text: 'text-[#4a5240]' },  // sage
  { bg: 'bg-[#e2d5cd]', text: 'text-[#7a5a4a]' },  // clay
  { bg: 'bg-[#d9d5d0]', text: 'text-[#5c5650]' },  // warm slate
  { bg: 'bg-[#e0d3d0]', text: 'text-[#7a5555]' },  // dusty rose
  { bg: 'bg-[#dfd8c8]', text: 'text-[#6b5e3e]' },  // ochre
];

function getAvatarColor(username: string) {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function mapStatus(status: AvailabilityStatus): 'open' | 'collaborating' | 'heads-down' {
  const map: Record<AvailabilityStatus, 'open' | 'collaborating' | 'heads-down'> = {
    OPEN_TO_TRIBE: 'open',
    AVAILABLE_FOR_PROJECTS: 'collaborating',
    JUST_BROWSING: 'heads-down',
  };
  return map[status];
}

/* ─── Loading Skeleton ─── */

function DiscoverSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px] px-6 py-16 animate-pulse">
      <div className="h-10 w-56 bg-surface-secondary rounded mb-3" />
      <div className="h-5 w-80 bg-surface-secondary rounded mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 bg-surface-secondary rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── Builder Grid ─── */

function BuilderGrid({ builders }: { builders: Builder[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {builders.map((builder) => {
        const avatar = getAvatarColor(builder.username);
        return (
          <Link
            key={builder.id}
            href={`/profile/${builder.username}`}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
          >
            <BuilderCard
              name={builder.displayName}
              initials={getInitials(builder.displayName)}
              title={builder.headline || formatRole(builder.primaryRole)}
              bio={builder.bio || undefined}
              skills={builder.skills.map((s) => s.name)}
              score={builder.builderScore}
              status={mapStatus(builder.availabilityStatus)}
              avatarColor={avatar.bg}
              avatarTextColor={avatar.text}
              avatarUrl={builder.avatarUrl}
              variant="featured"
            />
          </Link>
        );
      })}
    </div>
  );
}

function formatRole(role: string | null | undefined): string {
  if (!role) return 'Builder';
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

/* ─── Page ─── */

export default function DiscoverPage() {
  const { data, loading, error, fetchMore } = useQuery<GetBuildersData>(
    GET_BUILDERS,
    { variables: { limit: PAGE_SIZE, offset: 0 } },
  );

  if (loading) return <DiscoverSkeleton />;
  if (error) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-24 text-center">
        <h1 className="font-serif text-4xl text-ink mb-3">Something went wrong</h1>
        <p className="text-ink-secondary">Could not load builders. Try refreshing.</p>
      </div>
    );
  }

  const builders = data?.builders ?? [];

  const handleLoadMore = () => {
    fetchMore({
      variables: { offset: builders.length },
      updateQuery: (prev: GetBuildersData, { fetchMoreResult }: { fetchMoreResult?: GetBuildersData }) => {
        if (!fetchMoreResult) return prev;
        return {
          builders: [...prev.builders, ...fetchMoreResult.builders],
        };
      },
    });
  };

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-16">
      <h1 className="font-serif text-[40px] leading-tight text-ink mb-3">
        Discover Builders
      </h1>
      <p className="text-[15px] text-ink-secondary mb-12">
        Meet the makers shipping real products. Find your next collaborator.
      </p>

      <BuilderGrid builders={builders} />

      {builders.length >= PAGE_SIZE && (
        <div className="mt-12 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-3 text-[14px] font-medium text-ink-secondary bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors"
          >
            Load more builders
          </button>
        </div>
      )}
    </div>
  );
}
