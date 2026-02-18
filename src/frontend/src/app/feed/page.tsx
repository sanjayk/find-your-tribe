'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_FEED } from '@/lib/graphql/queries/feed';
import type { GetFeedData, FeedEvent, EventType } from '@/lib/graphql/types';

/* ─── Constants ─── */

const PAGE_SIZE = 20;

const EVENT_LABELS: Record<EventType, string> = {
  PROJECT_SHIPPED: 'Shipped',
  PROJECT_CREATED: 'Started Building',
  PROJECT_UPDATE: 'Project Update',
  TRIBE_FORMED: 'Tribe Formed',
  TRIBE_ANNOUNCEMENT: 'Tribe Announcement',
  COLLABORATOR_JOINED: 'Collaborator Joined',
  BUILDER_JOINED: 'Builder Joined',
};

/* ─── Helpers ─── */

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function eventLabelColor(eventType: EventType): string {
  switch (eventType) {
    case 'PROJECT_SHIPPED':
      return 'text-shipped';
    case 'PROJECT_CREATED':
    case 'COLLABORATOR_JOINED':
      return 'text-in-progress';
    case 'PROJECT_UPDATE':
    case 'TRIBE_ANNOUNCEMENT':
      return 'text-accent';
    default:
      return 'text-ink-tertiary';
  }
}

function eventDescription(event: FeedEvent): string {
  const meta = event.metadata;

  switch (event.eventType) {
    case 'PROJECT_SHIPPED': {
      const actor = (meta.actor_name as string) || '';
      const project = (meta.project_title as string) || '';
      if (actor && project) return `${actor} shipped ${project}`;
      if (project) return `Shipped ${project}`;
      return 'A project was shipped';
    }
    case 'PROJECT_CREATED': {
      const actor = (meta.actor_name as string) || '';
      const project = (meta.project_title as string) || '';
      if (actor && project) return `${actor} started building ${project}`;
      if (project) return `Started building ${project}`;
      return 'A new project was created';
    }
    case 'PROJECT_UPDATE': {
      const content = (meta.content as string) || '';
      if (content) return content;
      const project = (meta.project_title as string) || '';
      return project ? `Update on ${project}` : 'Project update';
    }
    case 'TRIBE_FORMED': {
      const actor = (meta.actor_name as string) || '';
      const tribe = (meta.tribe_name as string) || '';
      if (actor && tribe) return `${actor} formed ${tribe}`;
      if (tribe) return `Tribe formed: ${tribe}`;
      return 'A new tribe was formed';
    }
    case 'TRIBE_ANNOUNCEMENT': {
      const content = (meta.content as string) || '';
      if (content) return content;
      const tribe = (meta.tribe_name as string) || '';
      return tribe ? `Announcement from ${tribe}` : 'Tribe announcement';
    }
    case 'COLLABORATOR_JOINED': {
      const actor = (meta.actor_name as string) || '';
      const project = (meta.project_title as string) || '';
      if (actor && project) return `${actor} joined ${project} as collaborator`;
      if (actor) return `${actor} joined a project`;
      return 'A collaborator joined a project';
    }
    case 'BUILDER_JOINED': {
      const actor = (meta.actor_name as string) || '';
      if (actor) return `${actor} joined Find Your Tribe`;
      return 'A new builder joined';
    }
    default:
      return 'Activity recorded';
  }
}

/* ─── Skeleton ─── */

function FeedSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" data-testid="feed-skeleton">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-surface-elevated rounded-xl shadow-xs p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-24 bg-surface-secondary rounded" />
            <div className="h-3 w-16 bg-surface-secondary rounded" />
          </div>
          <div className="h-4 w-3/4 bg-surface-secondary rounded mb-2" />
          <div className="h-3 w-1/3 bg-surface-secondary rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State ─── */

function FeedEmpty() {
  return (
    <div className="rounded-xl bg-surface-secondary p-16 text-center" data-testid="feed-empty">
      <p className="font-serif text-xl text-ink mb-2">Nothing here yet</p>
      <p className="text-[14px] text-ink-tertiary leading-relaxed max-w-sm mx-auto">
        When builders ship projects, form tribes, and share updates, it all shows up here.
      </p>
    </div>
  );
}

/* ─── Error State ─── */

function FeedError() {
  return (
    <div className="rounded-xl bg-surface-secondary p-16 text-center" data-testid="feed-error">
      <p className="font-serif text-xl text-ink mb-2">Couldn&apos;t load the feed</p>
      <p className="text-[14px] text-ink-tertiary leading-relaxed max-w-sm mx-auto">
        Something went wrong fetching recent activity. Try refreshing the page.
      </p>
    </div>
  );
}

/* ─── Event Card ─── */

function EventCard({ event }: { event: FeedEvent }) {
  const label = EVENT_LABELS[event.eventType];
  const labelColor = eventLabelColor(event.eventType);
  const description = eventDescription(event);
  const time = relativeTime(event.createdAt);

  return (
    <article className="bg-surface-elevated rounded-xl shadow-xs p-5 mb-3">
      {/* Header: type label + timestamp */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={`overline ${labelColor}`}>{label}</span>
        <span className="text-[11px] text-ink-tertiary">{time}</span>
      </div>

      {/* Content */}
      <p className="text-[14px] text-ink-secondary leading-relaxed">
        {description}
      </p>

      {/* Target reference */}
      <p className="font-mono text-[11px] text-ink-tertiary mt-2.5">
        {event.targetType.toLowerCase()} / {event.targetId}
      </p>
    </article>
  );
}

/* ─── Page ─── */

export default function FeedPage() {
  const [offset, setOffset] = useState(0);

  const { data, loading, error, fetchMore } = useQuery<GetFeedData>(GET_FEED, {
    variables: { limit: PAGE_SIZE, offset: 0 },
  });

  const events = data?.feed ?? [];
  const hasMore = events.length > 0 && events.length % PAGE_SIZE === 0;

  function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    fetchMore({
      variables: { limit: PAGE_SIZE, offset: nextOffset },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev;
        return {
          feed: [...prev.feed, ...fetchMoreResult.feed],
        };
      },
    });
    setOffset(nextOffset);
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 md:px-6 py-12 md:py-16">
      {/* ─── Page Header ─── */}
      <header className="mb-10">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.01em] text-ink">
          The Feed
        </h1>
        <p className="text-[15px] text-ink-tertiary mt-2 leading-relaxed">
          What builders are shipping
        </p>
      </header>

      {/* ─── Content ─── */}
      {loading && events.length === 0 ? (
        <FeedSkeleton />
      ) : error && events.length === 0 ? (
        <FeedError />
      ) : events.length === 0 ? (
        <FeedEmpty />
      ) : (
        <>
          <div>
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="text-[13px] font-medium text-ink-tertiary hover:text-ink transition-colors px-5 py-2.5 rounded-lg bg-surface-secondary hover:bg-surface-secondary/80 disabled:opacity-50"
              >
                {loading ? 'Loading\u2026' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
