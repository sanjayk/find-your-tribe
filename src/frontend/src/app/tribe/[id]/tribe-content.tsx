'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { GET_TRIBE } from '@/lib/graphql/queries/tribes';
import {
  REQUEST_TO_JOIN,
  LEAVE_TRIBE,
  REMOVE_MEMBER,
  REMOVE_OPEN_ROLE,
  ADD_OPEN_ROLE,
  APPROVE_MEMBER,
  REJECT_MEMBER,
} from '@/lib/graphql/mutations/tribes';
import { useAuth } from '@/hooks/use-auth';
import { EditTribeModal } from '@/components/features/edit-tribe-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function formatTimeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
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

/* ─── Confirm Dialog ─── */

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Removing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Member Card ─── */

function MemberCard({
  member,
  isOwner,
  isSelf,
  viewerIsOwner,
  tribeId,
  onRefetch,
}: {
  member: TribeMember;
  isOwner: boolean;
  isSelf: boolean;
  viewerIsOwner: boolean;
  tribeId: string;
  onRefetch: () => void;
}) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeMember, { loading: removing }] = useMutation(REMOVE_MEMBER, {
    variables: { tribeId, memberId: member.user.id },
    onCompleted: () => {
      setShowRemoveConfirm(false);
      onRefetch();
    },
  });

  const roleLabel = member.user.primaryRole ? formatRole(member.user.primaryRole) : null;
  const showRemove = viewerIsOwner && !isOwner && !isSelf;

  return (
    <div className="bg-surface-elevated rounded-xl shadow-xs p-5 flex items-start gap-4" data-testid="member-card">
      <Link
        href={`/profile/${member.user.username}`}
        className="flex items-start gap-4 min-w-0 flex-1 card-lift"
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
            {viewerIsOwner && isSelf && (
              <span className="text-[12px] text-ink-tertiary">(you)</span>
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

      {showRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
          onClick={() => setShowRemoveConfirm(true)}
        >
          Remove
        </Button>
      )}

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove this member?"
        description={`${member.user.displayName} will be removed from the tribe. They can request to join again later.`}
        confirmLabel="Remove"
        onConfirm={() => removeMember()}
        loading={removing}
      />
    </div>
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
  onRefetch,
}: {
  openRole: OpenRole;
  tribeId: string;
  viewerRole: ViewerRole;
  tribeOpen: boolean;
  onJoinRequested: () => void;
  onRefetch: () => void;
}) {
  const [requestToJoin, { loading }] = useMutation(REQUEST_TO_JOIN, {
    variables: { tribeId, roleId: openRole.id },
    onCompleted: onJoinRequested,
  });
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState(openRole.title);
  const [editSkills, setEditSkills] = useState(openRole.skillsNeeded.join(', '));
  const [removeRole, { loading: removeLoading }] = useMutation(REMOVE_OPEN_ROLE, {
    variables: { roleId: openRole.id },
    onCompleted: () => {
      setShowRemoveConfirm(false);
      onRefetch();
    },
  });

  const showJoinButton = tribeOpen && viewerRole === 'visitor';
  const showPending = viewerRole === 'pending';
  const isOwnerViewing = viewerRole === 'owner';

  if (showEditForm && isOwnerViewing) {
    return (
      <div className="bg-surface-secondary rounded-xl p-5 space-y-3">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Role title"
        />
        <Input
          value={editSkills}
          onChange={(e) => setEditSkills(e.target.value)}
          placeholder="Skills (comma separated)"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowEditForm(false)}>
            Done
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditTitle(openRole.title);
              setEditSkills(openRole.skillsNeeded.join(', '));
              setShowEditForm(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

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

        <div className="shrink-0 flex items-center gap-2">
          {isOwnerViewing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-accent hover:text-accent-hover"
                onClick={() => setShowEditForm(true)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRemoveConfirm(true)}
              >
                Remove
              </Button>
            </>
          )}

          {!openRole.filled && !isOwnerViewing && (
            <>
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
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove this role?"
        description={`The "${openRole.title}" role will be removed from this tribe.`}
        confirmLabel="Remove"
        onConfirm={() => removeRole()}
        loading={removeLoading}
      />
    </div>
  );
}

/* ─── Add Role Form ─── */

function AddRoleForm({
  tribeId,
  onAdded,
  onCancel,
}: {
  tribeId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [addRole, { loading }] = useMutation(ADD_OPEN_ROLE, {
    onCompleted: () => {
      setTitle('');
      setSkills('');
      onAdded();
    },
  });

  const handleAdd = () => {
    if (!title.trim()) return;
    const skillsNeeded = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    addRole({ variables: { tribeId, title: title.trim(), skillsNeeded } });
  };

  return (
    <div className="bg-surface-secondary rounded-xl p-5 space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Role title"
        data-testid="add-role-title"
      />
      <Input
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
        placeholder="Skills (comma separated)"
        data-testid="add-role-skills"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={loading || !title.trim()}>
          {loading ? 'Adding...' : 'Add'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ─── Pending Requests Section ─── */

function PendingRequestsSection({
  tribeId,
  pendingMembers,
  onRefetch,
}: {
  tribeId: string;
  pendingMembers: TribeMember[];
  onRefetch: () => void;
}) {
  return (
    <section className="mb-12">
      <div className="h-px bg-surface-secondary mb-8" />
      <div className="flex items-baseline justify-between mb-6">
        <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary">
          Pending Requests
        </div>
        <span className="text-[13px] text-ink-tertiary">
          {pendingMembers.length} pending
        </span>
      </div>
      <div className="space-y-3">
        {pendingMembers.map((member) => (
          <PendingRequestCard
            key={member.user.id}
            member={member}
            tribeId={tribeId}
            onRefetch={onRefetch}
          />
        ))}
      </div>
    </section>
  );
}

function PendingRequestCard({
  member,
  tribeId,
  onRefetch,
}: {
  member: TribeMember;
  tribeId: string;
  onRefetch: () => void;
}) {
  const [approveMember, { loading: approving }] = useMutation(APPROVE_MEMBER, {
    variables: { tribeId, memberId: member.user.id },
    onCompleted: onRefetch,
  });
  const [rejectMember, { loading: rejecting }] = useMutation(REJECT_MEMBER, {
    variables: { tribeId, memberId: member.user.id },
    onCompleted: onRefetch,
  });

  const roleLabel = member.user.primaryRole ? formatRole(member.user.primaryRole) : null;

  return (
    <div className="bg-surface-elevated shadow-sm rounded-lg p-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-subtle to-accent-muted shrink-0">
          <span className="font-serif text-[16px] text-accent">
            {getInitials(member.user.displayName)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[15px] text-ink">
              {member.user.displayName}
            </span>
            {roleLabel && (
              <span className="text-[13px] text-ink-tertiary">
                {roleLabel}
              </span>
            )}
          </div>

          {member.requestedRole && (
            <p className="text-[13px] text-ink-secondary mt-1">
              Requested: {member.requestedRole.title}
              {member.joinedAt ? ` · ${formatTimeAgo(member.joinedAt)}` : ''}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-accent hover:text-accent-hover"
              asChild
            >
              <Link href={`/profile/${member.user.username}`}>View Profile</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => approveMember()}
              disabled={approving || rejecting}
            >
              {approving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => rejectMember()}
              disabled={approving || rejecting}
            >
              {rejecting ? 'Denying...' : 'Deny'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tribe Content ─── */

function TribeContent({
  tribe,
  viewerRole,
  userId,
  onRefetch,
}: {
  tribe: Tribe;
  viewerRole: ViewerRole;
  userId: string | undefined;
  onRefetch: () => void;
}) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  const statusConfig = STATUS_CONFIG[tribe.status];
  const activeMembers = tribe.members.filter((m) => m.status === 'ACTIVE');
  const pendingMembers = tribe.members.filter((m) => m.status === 'PENDING');
  const tribeOpen = tribe.status === 'OPEN';
  const isOwner = viewerRole === 'owner';

  const showRoles = tribe.openRoles.length > 0 || isOwner;
  const showMemberBar = viewerRole === 'member';
  const showPending = isOwner && pendingMembers.length > 0;

  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-12 md:pb-16">
      {/* ─── HERO SECTION ─── */}
      <section className="pt-10 lg:pt-14 pb-8 lg:pb-10">
        <div className="flex items-start justify-between">
          <div>
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
          </div>

          {/* Owner edit button */}
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="text-accent hover:text-accent-hover shrink-0"
              onClick={() => setEditModalOpen(true)}
            >
              Edit
            </Button>
          )}
        </div>

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

        {/* Creator / Dates */}
        {tribe.createdAt && (
          <div className="flex items-center gap-4 mt-4">
            <span className="text-[12px] text-ink-tertiary">
              {isOwner
                ? `You created this · ${formatDate(tribe.createdAt)}`
                : `Formed ${formatDate(tribe.createdAt)}`}
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
                isSelf={member.user.id === userId}
                viewerIsOwner={isOwner}
                tribeId={tribe.id}
                onRefetch={onRefetch}
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
                onRefetch={onRefetch}
              />
            ))}
            {isOwner && !showAddRole && (
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-accent hover:text-accent-hover"
                  onClick={() => setShowAddRole(true)}
                >
                  + Add a role
                </Button>
              </div>
            )}
            {isOwner && showAddRole && (
              <AddRoleForm
                tribeId={tribe.id}
                onAdded={() => {
                  setShowAddRole(false);
                  onRefetch();
                }}
                onCancel={() => setShowAddRole(false)}
              />
            )}
          </div>
        </section>
      )}

      {/* ─── PENDING REQUESTS ─── */}
      {showPending && (
        <PendingRequestsSection
          tribeId={tribe.id}
          pendingMembers={pendingMembers}
          onRefetch={onRefetch}
        />
      )}

      {/* ─── EDIT TRIBE MODAL ─── */}
      {isOwner && (
        <EditTribeModal
          isOpen={editModalOpen}
          tribe={tribe}
          onClose={() => setEditModalOpen(false)}
          onUpdated={onRefetch}
        />
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
      userId={user?.id}
      onRefetch={() => refetch()}
    />
  );
}
