'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { GET_FEED } from '@/lib/graphql/queries/feed';
import type { GetFeedData, FeedEvent, EventType } from '@/lib/graphql/types';
import {
  getInitials,
  getAvatarColor,
  getGradientClasses,
  getActionText,
  getLinkTarget,
  getActorDisplayName,
} from './feed-utils';
import type { FeedEventMetadata } from './feed-utils';

/* ─── Constants ─── */

const PAGE_SIZE = 20;

const ACTIVITY_TYPES: Set<EventType> = new Set([
  'MEMBER_JOINED_TRIBE',
  'COLLABORATION_CONFIRMED',
  'BUILDER_JOINED',
]);

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

/* ─── MilestoneCard (PROJECT_SHIPPED) ─── */

function MilestoneCard({ event }: { event: FeedEvent }) {
  const meta = event.metadata as FeedEventMetadata;
  const title = meta.project_title || 'Untitled project';
  const techStack = meta.tech_stack ?? [];
  const gradient = getGradientClasses(meta.project_title);

  return (
    <div className="bg-surface-elevated rounded-lg shadow-sm overflow-hidden hover:bg-surface-secondary/50 transition-colors duration-150 ease-in-out mt-2">
      <div
        className={`aspect-[3/1] bg-gradient-to-r ${gradient.from} ${gradient.via} ${gradient.to}`}
      />
      <div className="p-4">
        <p className="font-serif text-[16px] text-ink">{title}</p>
        {techStack.length > 0 && (
          <p className="font-mono text-[10px] text-ink-tertiary mt-2">
            {techStack.join(' \u00b7 ')}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── ContentEmbed (PROJECT_CREATED, TRIBE_CREATED) ─── */

function ContentEmbed({ event }: { event: FeedEvent }) {
  const meta = event.metadata as FeedEventMetadata;

  if (event.eventType === 'TRIBE_CREATED') {
    const tribeName = meta.tribe_name || 'Untitled tribe';
    const mission = meta.mission;

    return (
      <div className="hover:bg-surface-secondary/50 transition-colors duration-150 ease-in-out rounded-lg mt-2 py-1">
        <p className="font-serif text-[15px] text-ink">{tribeName}</p>
        {mission && (
          <p className="text-[12px] text-ink-secondary mt-1">{mission}</p>
        )}
      </div>
    );
  }

  // PROJECT_CREATED
  const title = meta.project_title || 'Untitled project';
  const techStack = meta.tech_stack ?? [];
  const gradient = getGradientClasses(meta.project_title);

  return (
    <div className="bg-surface-secondary rounded-lg p-4 hover:bg-surface-secondary/50 transition-colors duration-150 ease-in-out mt-2 flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-lg shrink-0 bg-gradient-to-r ${gradient.from} ${gradient.via} ${gradient.to}`}
      />
      <div>
        <p className="font-serif text-[15px] text-ink">{title}</p>
        {techStack.length > 0 && (
          <p className="font-mono text-[10px] text-ink-tertiary mt-1">
            {techStack.join(' \u00b7 ')}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── TextCard (PROJECT_UPDATE, TRIBE_ANNOUNCEMENT) ─── */

function TextCard({ event }: { event: FeedEvent }) {
  const meta = event.metadata as FeedEventMetadata;
  const content = meta.content;
  const attribution =
    event.eventType === 'PROJECT_UPDATE'
      ? meta.project_title
        ? `on ${meta.project_title}`
        : null
      : meta.tribe_name
        ? `in ${meta.tribe_name}`
        : null;

  return (
    <div className="hover:bg-surface-secondary/50 transition-colors duration-150 ease-in-out rounded-lg mt-2 py-1">
      {content && (
        <p className="text-[13px] text-ink-secondary italic">
          &ldquo;{content}&rdquo;
        </p>
      )}
      {attribution && (
        <p className="text-[11px] text-ink-tertiary mt-2">{attribution}</p>
      )}
    </div>
  );
}

/* ─── ActivityLine (MEMBER_JOINED_TRIBE, COLLABORATION_CONFIRMED, BUILDER_JOINED) ─── */

function ActivityLine({ event }: { event: FeedEvent }) {
  const meta = event.metadata as FeedEventMetadata;
  const actorName = getActorDisplayName(meta);

  switch (event.eventType) {
    case 'MEMBER_JOINED_TRIBE': {
      const tribeName = meta.tribe_name || 'Untitled tribe';
      return (
        <p className="text-[13px] text-ink-secondary">
          <span className="actor group-hover/node:underline transition-all duration-150 ease-in-out">
            {actorName}
          </span>{' '}
          joined {tribeName}
        </p>
      );
    }
    case 'COLLABORATION_CONFIRMED': {
      const projectTitle = meta.project_title || 'Untitled project';
      return (
        <p className="text-[13px] text-ink-secondary">
          <span className="actor group-hover/node:underline transition-all duration-150 ease-in-out">
            {actorName}
          </span>{' '}
          joined {projectTitle}
        </p>
      );
    }
    case 'BUILDER_JOINED': {
      const skills = meta.skills ?? [];
      return (
        <p className="text-[13px] text-ink-secondary">
          <span className="actor group-hover/node:underline transition-all duration-150 ease-in-out">
            {actorName}
          </span>{' '}
          joined
          {skills.length > 0 && (
            <>
              {' \u00b7 '}
              <span className="font-mono text-[11px] text-ink-tertiary">
                {skills.join(' / ')}
              </span>
            </>
          )}
        </p>
      );
    }
    default:
      return null;
  }
}

/* ─── TimelineNode ─── */

function TimelineNode({ event }: { event: FeedEvent }) {
  const meta = event.metadata as FeedEventMetadata;
  const initials = getInitials(meta);
  const avatarColor = getAvatarColor(
    meta.actor_name ?? meta.user_name ?? meta.member_name ?? meta.actor_username,
  );
  const actionText = getActionText(event.eventType);
  const time = relativeTime(event.createdAt);
  const linkTarget = getLinkTarget(
    event.targetType.toLowerCase(),
    event.targetId,
  );
  const isActivity = ACTIVITY_TYPES.has(event.eventType);

  function renderBody() {
    switch (event.eventType) {
      case 'PROJECT_SHIPPED':
        return <MilestoneCard event={event} />;
      case 'PROJECT_CREATED':
      case 'TRIBE_CREATED':
        return <ContentEmbed event={event} />;
      case 'PROJECT_UPDATE':
      case 'TRIBE_ANNOUNCEMENT':
        return <TextCard event={event} />;
      case 'MEMBER_JOINED_TRIBE':
      case 'COLLABORATION_CONFIRMED':
      case 'BUILDER_JOINED':
        return <ActivityLine event={event} />;
      default:
        return null;
    }
  }

  const content = (
    <article className={`relative pl-12 ${isActivity ? 'py-2' : 'py-5'} group/node`}>
      {/* Avatar */}
      <div
        className={`absolute left-0 ${isActivity ? 'top-2' : 'top-5'} w-9 h-9 rounded-full flex items-center justify-center ${avatarColor.bg} ${avatarColor.text} text-[12px] font-medium`}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Thread connector */}
      <div
        className="absolute left-[18px] top-0 bottom-0 w-px"
        aria-hidden="true"
      />

      {/* Actor header row */}
      <div className="flex items-baseline gap-2">
        <span className="text-ink text-[14px] font-medium">
          {getActorDisplayName(meta)}
        </span>
        <span className="text-ink-tertiary text-[12px]">{actionText}</span>
        <time
          dateTime={event.createdAt}
          className="text-ink-tertiary text-[11px] ml-auto"
        >
          {time}
        </time>
      </div>

      {/* Body */}
      {renderBody()}
    </article>
  );

  if (linkTarget) {
    return (
      <Link href={linkTarget} className="block no-underline text-inherit">
        {content}
      </Link>
    );
  }

  return content;
}

/* ─── FeedTimeline ─── */

function FeedTimeline({ events }: { events: FeedEvent[] }) {
  return (
    <div className="relative" data-testid="feed-timeline">
      {/* Thread line */}
      <div
        className="absolute left-[18px] top-0 bottom-0 w-px bg-ink-tertiary/20"
        aria-hidden="true"
      />

      {events.map((event) => (
        <TimelineNode key={event.id} event={event} />
      ))}
    </div>
  );
}

/* ─── Skeleton ─── */

function FeedSkeleton() {
  return (
    <div className="relative animate-pulse" data-testid="feed-skeleton">
      {/* Thread line */}
      <div className="absolute left-[18px] top-0 bottom-0 w-px bg-ink-tertiary/20" />

      {/* Expanded node */}
      <div className="relative pl-12 py-5">
        <div className="absolute left-0 top-5 w-9 h-9 rounded-full bg-surface-secondary" />
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-20 bg-surface-secondary rounded" />
          <div className="h-2.5 w-14 bg-surface-secondary rounded" />
          <div className="h-2.5 w-10 bg-surface-secondary rounded ml-auto" />
        </div>
        <div className="h-24 w-full bg-surface-secondary rounded-lg" />
      </div>

      {/* Compact node */}
      <div className="relative pl-12 py-2">
        <div className="absolute left-0 top-2 w-9 h-9 rounded-full bg-surface-secondary" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 bg-surface-secondary rounded" />
          <div className="h-2.5 w-32 bg-surface-secondary rounded" />
        </div>
      </div>

      {/* Expanded node */}
      <div className="relative pl-12 py-5">
        <div className="absolute left-0 top-5 w-9 h-9 rounded-full bg-surface-secondary" />
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-24 bg-surface-secondary rounded" />
          <div className="h-2.5 w-12 bg-surface-secondary rounded" />
          <div className="h-2.5 w-8 bg-surface-secondary rounded ml-auto" />
        </div>
        <div className="h-16 w-3/4 bg-surface-secondary rounded-lg" />
      </div>

      {/* Compact node */}
      <div className="relative pl-12 py-2">
        <div className="absolute left-0 top-2 w-9 h-9 rounded-full bg-surface-secondary" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-surface-secondary rounded" />
          <div className="h-2.5 w-28 bg-surface-secondary rounded" />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */

function FeedEmpty() {
  return (
    <div className="rounded-xl bg-surface-secondary p-8 sm:p-16 text-center" data-testid="feed-empty">
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
    <div className="rounded-xl bg-surface-secondary p-8 sm:p-16 text-center" data-testid="feed-error">
      <p className="font-serif text-xl text-ink mb-2">Couldn&apos;t load the feed</p>
      <p className="text-[14px] text-ink-tertiary leading-relaxed max-w-sm mx-auto">
        Something went wrong fetching recent activity. Try refreshing the page.
      </p>
    </div>
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
        <h1 className="font-serif text-[28px] sm:text-[40px] leading-[1.1] tracking-[-0.01em] text-ink">
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
          <FeedTimeline events={events} />

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
