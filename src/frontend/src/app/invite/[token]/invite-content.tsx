'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { useEffect } from 'react';
import Link from 'next/link';
import { INVITE_TOKEN_INFO } from '@/lib/graphql/queries/invitations';
import { REDEEM_INVITE_TOKEN } from '@/lib/graphql/mutations/projects';
import { useAuth } from '@/hooks/use-auth';
import type { GetInviteTokenInfoData } from '@/lib/graphql/types';

/* ─── Types ─── */

interface RedeemData {
  projects: {
    redeemInviteToken: {
      user: { id: string; username: string; displayName: string };
      role: string | null;
      status: string;
    };
  };
}

/* ─── Helpers ─── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRole(role: string): string {
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

/* ─── Loading Skeleton ─── */

function InviteSkeleton() {
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
      <div
        className="bg-surface-elevated rounded-2xl shadow-md p-10 max-w-md w-full animate-pulse"
        data-testid="invite-skeleton"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-surface-secondary" />
          <div className="space-y-3 w-full text-center">
            <div className="h-4 w-48 bg-surface-secondary rounded mx-auto" />
            <div className="h-8 w-64 bg-surface-secondary rounded mx-auto" />
          </div>
          <div className="h-11 w-full bg-surface-secondary rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Error State ─── */

function InviteError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
      <div className="bg-surface-elevated rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <h1 className="font-serif text-2xl text-ink mb-3">Invite not valid</h1>
        <p className="text-[15px] text-ink-secondary">{message}</p>
        <Link
          href="/"
          className="mt-8 inline-block text-[14px] text-accent hover:text-accent-hover transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

/* ─── Unauthenticated View ─── */

function UnauthenticatedView({
  token,
  projectTitle,
  inviterName,
  role,
}: {
  token: string;
  projectTitle: string;
  inviterName: string;
  role: string | null;
}) {
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
      <div className="bg-surface-elevated rounded-2xl shadow-md p-10 max-w-md w-full">
        <div className="flex flex-col items-center gap-6">
          {/* Inviter avatar with initials */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-subtle to-accent-muted flex items-center justify-center">
            <span className="font-serif text-[22px] text-accent">
              {getInitials(inviterName)}
            </span>
          </div>

          {/* Context */}
          <div className="text-center">
            <p className="text-[14px] text-ink-secondary mb-2">
              <span className="font-medium text-ink">{inviterName}</span>{' '}
              invited you to collaborate on
            </p>
            <h1 className="font-serif text-[28px] leading-[1.1] tracking-[-0.01em] text-ink">
              {projectTitle}
            </h1>
            {role && (
              <p className="text-[13px] text-ink-tertiary mt-2">
                As: {formatRole(role)}
              </p>
            )}
          </div>

          {/* Primary CTA */}
          <Link
            href={`/signup?invite_token=${token}`}
            className="w-full inline-flex items-center justify-center bg-ink text-ink-inverse font-medium text-[15px] px-6 py-3 rounded-xl hover:bg-ink/90 transition-colors"
          >
            Sign up to collaborate
          </Link>

          {/* Secondary */}
          <p className="text-[13px] text-ink-tertiary">
            Already have an account?{' '}
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Authenticated Success View ─── */

function AuthenticatedSuccess({
  projectTitle,
  projectId,
  username,
}: {
  projectTitle: string;
  projectId: string;
  username: string | undefined;
}) {
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
      <div className="bg-surface-elevated rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-shipped-subtle flex items-center justify-center mx-auto mb-6">
          <span className="text-shipped text-xl">✓</span>
        </div>

        <h1 className="font-serif text-[26px] leading-[1.2] text-ink mb-3">
          {"You're in"}
        </h1>

        <p className="text-[15px] text-ink-secondary mb-8">
          {"You've been added as a pending collaborator on "}
          <span className="font-medium text-ink">{projectTitle}</span>.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center justify-center bg-ink text-ink-inverse font-medium text-[15px] px-6 py-3 rounded-xl hover:bg-ink/90 transition-colors"
          >
            View Project
          </Link>
          <Link
            href={username ? `/profile/${username}` : '/'}
            className="text-[14px] text-ink-secondary hover:text-ink transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function InviteContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const { data, loading } = useQuery<GetInviteTokenInfoData>(INVITE_TOKEN_INFO, {
    variables: { token },
    skip: !token,
  });

  const [redeemToken, { data: redeemData, error: redeemError, called }] =
    useMutation<RedeemData>(REDEEM_INVITE_TOKEN);

  useEffect(() => {
    if (
      isAuthenticated &&
      !authLoading &&
      token &&
      data?.inviteTokenInfo &&
      !data.inviteTokenInfo.expired &&
      !called
    ) {
      redeemToken({ variables: { token } });
    }
  }, [isAuthenticated, authLoading, token, data, called, redeemToken]);

  if (loading || authLoading) return <InviteSkeleton />;

  if (!data?.inviteTokenInfo) {
    return (
      <InviteError message="This invite link is invalid or has been removed." />
    );
  }

  const info = data.inviteTokenInfo;

  if (info.expired) {
    return <InviteError message="This invite link has expired." />;
  }

  if (isAuthenticated) {
    if (!called) return <InviteSkeleton />;

    if (redeemError) {
      const isAlreadyMember = redeemError.message
        .toLowerCase()
        .includes('already');
      return (
        <InviteError
          message={
            isAlreadyMember
              ? 'You are already a collaborator on this project.'
              : 'Something went wrong. This invite may have already been used.'
          }
        />
      );
    }

    if (!redeemData) return <InviteSkeleton />;

    return (
      <AuthenticatedSuccess
        projectTitle={info.projectTitle}
        projectId={info.projectId}
        username={user?.username}
      />
    );
  }

  return (
    <UnauthenticatedView
      token={token}
      projectTitle={info.projectTitle}
      inviterName={info.inviterName}
      role={info.role}
    />
  );
}
