import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ username: 'mayachen' }),
  useRouter: () => ({ push: vi.fn() }),
}));

let mockAuthUser: {
  id: string;
  username: string;
  displayName: string;
  email: string;
  onboardingCompleted: boolean;
} | null = null;

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    accessToken: null,
    isAuthenticated: !!mockAuthUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

/* ─── Import AFTER mocks ─── */

import ProfilePageContent from './profile-content';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import { MY_PENDING_INVITATIONS } from '@/lib/graphql/queries/invitations';

/* ─── Canvas mock for BurnHeatmap ─── */

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  });
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width: 200,
    height: 40,
    top: 0,
    left: 0,
    right: 200,
    bottom: 40,
  });

  mockAuthUser = null;
});

/* ─── Fixtures ─── */

const OWNER_AUTH = {
  id: '1',
  username: 'mayachen',
  displayName: 'Maya Chen',
  email: 'maya@test.com',
  onboardingCompleted: true,
};

const VISITOR_AUTH = {
  id: '99',
  username: 'visitor',
  displayName: 'Visitor',
  email: 'visitor@test.com',
  onboardingCompleted: true,
};

const BASE_BUILDER = {
  id: '1',
  username: 'mayachen',
  displayName: 'Maya Chen',
  avatarUrl: null,
  headline: 'Full-stack engineer building with AI',
  primaryRole: 'ENGINEER',
  timezone: 'America/Los_Angeles',
  availabilityStatus: 'OPEN_TO_TRIBE',
  builderScore: 72,
  bio: 'Building cool things.',
  contactLinks: {},
  githubUsername: 'mayachen',
  agentTools: null,
  agentWorkflowStyle: null,
  humanAgentRatio: 0.5,
  preferences: {},
  createdAt: '2025-01-01T00:00:00Z',
  skills: [],
  projects: [],
  tribes: [],
  profileCompleteness: 0.6,
  completenessFields: ['bio'],
};

const emptyInvitationsMock = {
  request: { query: MY_PENDING_INVITATIONS },
  result: { data: { myPendingInvitations: [] } },
};

function makeBuilderMock(profileCompleteness: number) {
  return {
    request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
    result: { data: { user: { ...BASE_BUILDER, profileCompleteness } } },
  };
}

/* ─── Tests ─── */

describe('ProfileContent — CompletenessNudge integration', () => {
  it('renders nudge when isOwnProfile=true and completeness < 1.0', async () => {
    mockAuthUser = OWNER_AUTH;
    render(
      <MockedProvider mocks={[makeBuilderMock(0.6), emptyInvitationsMock]}>
        <ProfilePageContent />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByRole('link', { name: 'Finish profile →' })).toBeInTheDocument();
  });

  it('does NOT render nudge when isOwnProfile=false (other user profile)', async () => {
    mockAuthUser = VISITOR_AUTH;
    render(
      <MockedProvider mocks={[makeBuilderMock(0.6)]}>
        <ProfilePageContent />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.queryByRole('link', { name: 'Finish profile →' })).not.toBeInTheDocument();
  });

  it('does NOT render nudge when completeness = 1.0 (own profile, complete)', async () => {
    mockAuthUser = OWNER_AUTH;
    render(
      <MockedProvider mocks={[makeBuilderMock(1.0), emptyInvitationsMock]}>
        <ProfilePageContent />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.queryByRole('link', { name: 'Finish profile →' })).not.toBeInTheDocument();
  });

  it('displays correct percentage from builder data', async () => {
    mockAuthUser = OWNER_AUTH;
    render(
      <MockedProvider mocks={[makeBuilderMock(0.67), emptyInvitationsMock]}>
        <ProfilePageContent />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText(/67% complete/)).toBeInTheDocument();
  });

  it('nudge link points to /settings', async () => {
    mockAuthUser = OWNER_AUTH;
    render(
      <MockedProvider mocks={[makeBuilderMock(0.5), emptyInvitationsMock]}>
        <ProfilePageContent />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    const link = screen.getByRole('link', { name: 'Finish profile →' });
    expect(link).toHaveAttribute('href', '/settings');
  });
});
