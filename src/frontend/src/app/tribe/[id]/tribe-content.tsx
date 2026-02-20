'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { GET_TRIBE } from '@/lib/graphql/queries/tribes';
import { REQUEST_TO_JOIN, LEAVE_TRIBE } from '@/lib/graphql/mutations/tribes';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  GetTribeData,
  Tribe,
  TribeMember,
  OpenRole,
  TribeStatus,
} from '@/lib/graphql/types';

/* ─── Types ─── */

type ViewerRole = 'visitor' | 'pending' | 'member' | 'owner';

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

function computeViewerRole(userId: string | undefined, tribe: Tribe): ViewerRole {
  if (!userId) return 'visitor';
  const membership = tribe.members.find((m) => m.user.id === userId);
  if (!membership) return 'visitor';
  if (membership.status === 'PENDING') return 'pending';
  if (membership.status !== 'ACTIVE') return 'visitor';
  if (membership.role === 'OWNER') return 'owner';
  return 'member';
}

const STATUS_CONFIG: Record<TribeStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Open',
    className: 'bg-shipped-subtle text-shipped',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-accent-subtle text-accent',
  },
  ALUMNI: {
    label: 'Alumni',
    className: 'bg-surface-secondary text-ink-tertiary',
  },
};

/* ─── Loading Skeleton ─── */

function TribeSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16 animate-pulse"
      data-testid="tribe-skeleton"
    >
      <div className="pt-10 lg:pt-14 pb-8 lg:pb-10">
        <div className="h-5 w-20 bg-surface-secondary rounded mb-4" />
        <div className="h-12 w-64 bg-surface-secondary rounded mb-3" />
        <div className="h-5 w-full max-w-lg bg-surface-secondary rounded mb-2" />
        <div className="h-5 w-2/3 max-w-md bg-surface-secondary rounded" />
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <div className="h-28 bg-surface-elevated rounded-xl shadow-xs" />
        <div className="h-28 bg-surface-elevated rounded-xl shadow-xs" />
        <div className="h-28 bg-surface-elevated rounded-xl shadow-xs" />
      </div>
    </div>
  );
}

/* ─── Not Found ─── */

function TribeNotFound() {
  return (
    <div className="mx-auto max-w-[1080px] px-6 py-24 text-center">
      <h1 className="font-serif text-4xl text-ink mb-3">Tribe not found</h1>
      <p className="text-ink-secondary">
        This tribe doesn&apos;t exist or may have been removed.
      </p>
    </div>
  );
}

/* ─── Member Card ─── */

function MemberCard({ member, isOwner }: { member: TribeMember; isOwner: boolean }) {
  const roleLabel = member.user.primaryRole ? formatRole(member.user.primaryRole) : null;

  return (
    <Link
      href={`/profile/${member.user.username}`}
      className="bg-surface-elevated rounded-xl shadow-xs p-5 flex items-start gap-4 card-lift"
    >
      {/* Avatar initial */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-subtle to-accent-muted shrink-0">
        <span className="font-serif text-[16px] text-accent">
          {getInitials(member.user.displayName)}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[15px] text-ink truncate">
            {member.user.displayName}
          </span>
          {isOwner && (
            <span className="font-mono text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded-md shrink-0">
              Owner
            </span>
          )}
        </div>
        <p className="text-[13px] text-ink-tertiary mt-0.5">
          @{member.user.username}
          {roleLabel ? ` \u00b7 ${roleLabel}` : ''}
        </p>
        {member.user.headline && (
          <p className="text-[13px] text-ink-secondary mt-1 line-clamp-1">
            {member.user.headline}
          </p>
        )}
        {member.joinedAt && (
          <p className="text-[11px] text-ink-tertiary mt-1.5">
            Joined {formatDate(member.joinedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ─── Member Action Bar ─── */

function MemberActionBar({
  tribeId,
  onLeaveComplete,
}: {
  tribeId: string;
  onLeaveComplete: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [leaveTribe, { loading }] = useMutation(LEAVE_TRIBE, {
    variables: { tribeId },
    onCompleted: () => {
      setShowConfirm(false);
      onLeaveComplete();
    },
  });

  return (
    <>
      <div className="flex items-center justify-between py-3 mb-8" data-testid="member-action-bar">
        <span className="text-[13px] text-ink-tertiary">
          You&apos;re a member of this tribe.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowConfirm(true)}
        >
          Leave Tribe
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent showCloseButton={false} data-testid="leave-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Leave this tribe?</DialogTitle>
            <DialogDescription>
              You&apos;ll need to request to join again if you change your mind.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => leaveTribe()}
              disabled={loading}
            >
              {loading ? 'Leaving...' : 'Leave Tribe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Open Role Card ─── */

function OpenRoleCard({
  openRole,
  tribeId,
  viewerRole,
  tribeOpen,
  onJoinRequested,
}: {
  openRole: OpenRole;
  tribeId: string;
  viewerRole: ViewerRole;
  tribeOpen: boolean;
  onJoinRequested: () => void;
}) {
  const [requestToJoin, { loading }] = useMutation(REQUEST_TO_JOIN, {
    variables: { tribeId, roleId: openRole.id },
    onCompleted: onJoinRequested,
  });

  const showJoinButton = tribeOpen && viewerRole === 'visitor';
  const showPending = viewerRole === 'pending';

  return (
    <div className="bg-surface-secondary rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-[15px] text-ink mb-2">
            {openRole.title}
          </h3>
          {openRole.skillsNeeded.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {openRole.skillsNeeded.map((skill) => (
                <span
                  key={skill}
                  className="font-mono text-[11px] bg-accent-subtle text-accent px-2.5 py-0.5 rounded-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {openRole.filled && (
            <p className="text-[13px] text-ink-tertiary mt-2">Role Filled</p>
          )}
        </div>

        {!openRole.filled && (
          <div className="shrink-0">
            {showJoinButton && (
              <Button
                size="sm"
                onClick={() => requestToJoin()}
                disabled={loading}
              >
                {loading ? 'Requesting...' : 'Request to Join'}
              </Button>
            )}
            {showPending && (
              <Button size="sm" variant="secondary" disabled>
                Request Pending
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tribe Content ─── */

function TribeContent({
  tribe,
  viewerRole,
  onRefetch,
}: {
  tribe: Tribe;
  viewerRole: ViewerRole;
  onRefetch: () => void;
}) {
  const statusConfig = STATUS_CONFIG[tribe.status];
  const activeMembers = tribe.members.filter((m) => m.status === 'ACTIVE');
  const tribeOpen = tribe.status === 'OPEN';

  const showRoles = tribe.openRoles.length > 0;
  const showMemberBar = viewerRole === 'member';

  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16">
      {/* ─── HERO SECTION ─── */}
      <section className="pt-10 lg:pt-14 pb-8 lg:pb-10">
        {/* Status badge */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] px-3 py-1 rounded-full ${statusConfig.className}`}
          >
            {tribe.status === 'OPEN' && (
              <span className="w-1.5 h-1.5 rounded-full bg-shipped" />
            )}
            {tribe.status === 'ACTIVE' && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            )}
            {statusConfig.label}
          </span>
        </div>

        {/* Name */}
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.01em] mb-3">
          {tribe.name}
        </h1>

        {/* Member count */}
        <p className="text-[14px] text-ink-tertiary mb-3">
          {activeMembers.length} / {tribe.maxMembers} members
        </p>

        {/* Mission */}
        {tribe.mission && (
          <p className="text-[16px] text-ink-secondary leading-[1.65] max-w-2xl">
            {tribe.mission}
          </p>
        )}

        {/* Dates */}
        {tribe.createdAt && (
          <div className="flex items-center gap-4 mt-4">
            <span className="text-[12px] text-ink-tertiary">
              Formed {formatDate(tribe.createdAt)}
            </span>
          </div>
        )}
      </section>

      {/* ─── MEMBER ACTION BAR ─── */}
      {showMemberBar && (
        <MemberActionBar tribeId={tribe.id} onLeaveComplete={onRefetch} />
      )}

      {/* ─── MEMBERS ─── */}
      <section className="mb-12">
        <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
          Members
        </div>
        {activeMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMembers.map((member: TribeMember) => (
              <MemberCard
                key={member.user.id}
                member={member}
                isOwner={member.role === 'OWNER'}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-secondary p-12 text-center">
            <p className="text-[15px] text-ink-tertiary">No active members yet.</p>
          </div>
        )}
      </section>

      {/* ─── OPEN ROLES ─── */}
      {showRoles && (
        <section className="mb-12">
          <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
            Open Roles
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tribe.openRoles.map((role: OpenRole) => (
              <OpenRoleCard
                key={role.id}
                openRole={role}
                tribeId={tribe.id}
                viewerRole={viewerRole}
                tribeOpen={tribeOpen}
                onJoinRequested={onRefetch}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function TribePageContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery<GetTribeData>(GET_TRIBE, {
    variables: { id },
    skip: !id,
  });

  if (loading) return <TribeSkeleton />;
  if (error || !data?.tribe) return <TribeNotFound />;

  const tribe = data.tribe;
  const viewerRole = computeViewerRole(user?.id, tribe);

  return (
    <TribeContent
      tribe={tribe}
      viewerRole={viewerRole}
      onRefetch={() => refetch()}
    />
  );
}
