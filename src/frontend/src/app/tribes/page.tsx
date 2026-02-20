'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { Search, Users } from 'lucide-react';

import { GET_TRIBES, SEARCH_TRIBES } from '@/lib/graphql/queries/tribes';
import type { Tribe, TribeStatus, GetTribesData, SearchTribesData } from '@/lib/graphql/types';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const MAX_SEEKING_ROLES = 3;

/* ─── Status helpers ─── */

const STATUS_CONFIG: Record<TribeStatus, { color: string; stripColor: string; label: string }> = {
  OPEN: { color: 'bg-[#c4775a]', stripColor: 'bg-[#c4775a]', label: 'Open' },
  ACTIVE: { color: 'bg-accent', stripColor: 'bg-accent', label: 'Active' },
  ALUMNI: { color: 'bg-ink-tertiary', stripColor: 'bg-ink-tertiary', label: 'Alumni' },
};

function getMemberCount(tribe: Tribe): string {
  const active = tribe.members.filter((m) => m.status === 'ACTIVE').length;
  if (tribe.status === 'OPEN') return `${active}/${tribe.maxMembers}`;
  return String(active);
}

function getUnfilledRoles(tribe: Tribe) {
  return tribe.openRoles.filter((r) => !r.filled);
}

/* ─── Debounce hook ─── */

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ─── Loading Skeleton ─── */

function TribesSkeleton() {
  return (
    <div className="mx-auto max-w-[780px] px-6 py-16 animate-pulse">
      <div className="text-center mb-10">
        <div className="h-3 w-16 bg-surface-secondary rounded mx-auto mb-4" />
        <div className="h-10 w-64 bg-surface-secondary rounded mx-auto mb-3" />
        <div className="h-4 w-80 bg-surface-secondary rounded mx-auto mb-8" />
        <div className="h-12 max-w-[560px] bg-surface-secondary rounded-lg mx-auto" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface-secondary rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ─── Empty States ─── */

function EmptyNoTribes() {
  return (
    <div className="text-center py-16">
      <Users className="w-10 h-10 text-ink-tertiary mx-auto mb-4" />
      <p className="font-serif text-lg text-ink mb-2">No tribes yet</p>
      <Link
        href="/tribe/create"
        className="inline-block px-5 py-2.5 text-[14px] font-medium text-ink-secondary bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors"
      >
        Create a Tribe
      </Link>
    </div>
  );
}

function EmptyNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="text-center py-16">
      <Search className="w-10 h-10 text-ink-tertiary mx-auto mb-4" />
      <p className="font-serif text-lg text-ink mb-2">No tribes match that search</p>
      <button
        onClick={onClear}
        className="px-5 py-2.5 text-[14px] font-medium text-ink-secondary bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors"
      >
        Clear search
      </button>
    </div>
  );
}

/* ─── Tribe Row ─── */

function TribeRow({ tribe }: { tribe: Tribe }) {
  const config = STATUS_CONFIG[tribe.status];
  const unfilledRoles = getUnfilledRoles(tribe);
  const isAlumni = tribe.status === 'ALUMNI';

  return (
    <Link
      href={`/tribe/${tribe.id}`}
      className={`group block relative rounded-lg transition-colors hover:bg-surface-secondary ${isAlumni ? 'opacity-85' : ''}`}
    >
      {/* Left accent strip */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${config.stripColor}`} />

      <div className="pl-5 pr-5 py-4">
        {/* Line 1: Name, Mission, Member count, Status */}
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-serif text-[16px] text-ink shrink-0">{tribe.name}</span>
          {tribe.mission && (
            <span className="text-[14px] italic text-ink-secondary truncate min-w-0">
              &ldquo;{tribe.mission}&rdquo;
            </span>
          )}
          <span className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-[13px] text-ink-tertiary tabular-nums">
              {getMemberCount(tribe)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-[6px] h-[6px] rounded-full ${config.color}`} />
              <span className="text-[11px] uppercase tracking-wide font-medium text-ink-tertiary">
                {config.label}
              </span>
            </span>
          </span>
        </div>

        {/* Line 2: Seeking roles (Open tribes only) */}
        {tribe.status === 'OPEN' && unfilledRoles.length > 0 && (
          <div className="mt-1.5 text-[13px]">
            <span className="text-ink-tertiary">Seeking: </span>
            <span className="text-ink">
              {unfilledRoles.slice(0, MAX_SEEKING_ROLES).map((r) => r.title).join(', ')}
              {unfilledRoles.length > MAX_SEEKING_ROLES && (
                <span className="text-ink-tertiary"> +{unfilledRoles.length - MAX_SEEKING_ROLES} more</span>
              )}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Results Count ─── */

function ResultsCount({ count, query }: { count: number; query: string }) {
  const label = count === 1 ? 'tribe' : 'tribes';
  return (
    <p className="body-sm text-ink-tertiary mb-4">
      {query
        ? `${count} ${label} matching "${query}"`
        : `${count} ${label}`}
    </p>
  );
}

/* ─── Page ─── */

export default function TribesPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, DEBOUNCE_MS);
  const isSearching = debouncedQuery.length > 0;

  // Default load: all tribes
  const {
    data: defaultData,
    loading: defaultLoading,
    error: defaultError,
    fetchMore: fetchMoreDefault,
  } = useQuery<GetTribesData>(GET_TRIBES, {
    variables: { limit: PAGE_SIZE, offset: 0 },
  });

  // Search query: only when user types
  const {
    data: searchData,
    loading: searchLoading,
    fetchMore: fetchMoreSearch,
  } = useQuery<SearchTribesData>(SEARCH_TRIBES, {
    variables: { query: debouncedQuery, limit: PAGE_SIZE, offset: 0 },
    skip: !isSearching,
  });

  const tribes = isSearching ? (searchData?.searchTribes ?? []) : (defaultData?.tribes ?? []);
  const loading = isSearching ? searchLoading : defaultLoading;
  const canLoadMore = tribes.length >= PAGE_SIZE && tribes.length % PAGE_SIZE === 0;

  const handleLoadMore = useCallback(() => {
    if (isSearching) {
      fetchMoreSearch({
        variables: { offset: tribes.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return { searchTribes: [...prev.searchTribes, ...fetchMoreResult.searchTribes] };
        },
      });
    } else {
      fetchMoreDefault({
        variables: { offset: tribes.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return { tribes: [...prev.tribes, ...fetchMoreResult.tribes] };
        },
      });
    }
  }, [isSearching, fetchMoreSearch, fetchMoreDefault, tribes.length]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
  }, []);

  if (defaultLoading && !isSearching) return <TribesSkeleton />;

  if (defaultError) {
    return (
      <div className="mx-auto max-w-[780px] px-6 py-24 text-center">
        <h1 className="font-serif text-4xl text-ink mb-3">Something went wrong</h1>
        <p className="text-ink-secondary">Could not load tribes. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[780px] px-6 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="overline text-ink-tertiary mb-4">TRIBES</p>
        <h1 className="font-serif text-[40px] leading-tight text-ink mb-3">
          Find your people
        </h1>
        <p className="body-sm text-ink-secondary mb-8">
          Search by skill, role, name, or mission.
        </p>

        {/* Search bar */}
        <div className="relative max-w-[560px] mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Python, hotel, designer..."
            className="w-full pl-11 pr-4 py-3 text-[15px] bg-surface-elevated rounded-lg shadow-sm placeholder:text-ink-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-secondary rounded-lg" />
          ))}
        </div>
      ) : tribes.length === 0 ? (
        isSearching ? (
          <EmptyNoResults onClear={handleClearSearch} />
        ) : (
          <EmptyNoTribes />
        )
      ) : (
        <>
          <ResultsCount count={tribes.length} query={isSearching ? debouncedQuery : ''} />
          <div className="space-y-1">
            {tribes.map((tribe) => (
              <TribeRow key={tribe.id} tribe={tribe} />
            ))}
          </div>
          {canLoadMore && (
            <div className="mt-10 text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 text-[14px] font-medium text-ink-secondary bg-transparent hover:bg-surface-secondary rounded-lg transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
