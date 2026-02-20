import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import InviteContent from './invite-content';
import { INVITE_TOKEN_INFO } from '@/lib/graphql/queries/invitations';
import { REDEEM_INVITE_TOKEN } from '@/lib/graphql/mutations/projects';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'test-token-123' }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mutable auth state for per-test control
let mockIsAuthenticated = false;
let mockAuthUser: {
  id: string;
  username: string;
  displayName: string;
  email: string;
  onboardingCompleted: boolean;
} | null = null;

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: false,
    user: mockAuthUser,
  }),
}));

const BASE_TOKEN_INFO = {
  projectTitle: 'Awesome Project',
  projectId: 'proj-1',
  inviterName: 'Maya Chen',
  inviterAvatarUrl: null,
  role: 'ENGINEER',
  expired: false,
};

function makeTokenInfoMock(overrides: Partial<typeof BASE_TOKEN_INFO> = {}) {
  return {
    request: {
      query: INVITE_TOKEN_INFO,
      variables: { token: 'test-token-123' },
    },
    result: {
      data: { inviteTokenInfo: { ...BASE_TOKEN_INFO, ...overrides } },
    },
  };
}

const REDEEM_SUCCESS_MOCK = {
  request: {
    query: REDEEM_INVITE_TOKEN,
    variables: { token: 'test-token-123' },
  },
  result: {
    data: {
      projects: {
        redeemInviteToken: {
          user: { id: 'u1', username: 'janedoe', displayName: 'Jane Doe' },
          role: 'ENGINEER',
          status: 'pending',
        },
      },
    },
  },
};

describe('InviteContent', () => {
  beforeEach(() => {
    mockIsAuthenticated = false;
    mockAuthUser = null;
  });

  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={[makeTokenInfoMock()]}>
        <InviteContent />
      </MockedProvider>,
    );
    expect(
      document.querySelector('[data-testid="invite-skeleton"]'),
    ).toBeInTheDocument();
  });

  it('shows error for invalid token (null response)', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: INVITE_TOKEN_INFO,
              variables: { token: 'test-token-123' },
            },
            result: { data: { inviteTokenInfo: null } },
          },
        ]}
      >
        <InviteContent />
      </MockedProvider>,
    );
    expect(await screen.findByText('Invite not valid')).toBeInTheDocument();
    expect(
      screen.getByText(/invalid or has been removed/i),
    ).toBeInTheDocument();
  });

  it('shows error for expired token', async () => {
    render(
      <MockedProvider mocks={[makeTokenInfoMock({ expired: true })]}>
        <InviteContent />
      </MockedProvider>,
    );
    expect(await screen.findByText('Invite not valid')).toBeInTheDocument();
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('shows signup CTA for unauthenticated user with project and inviter info', async () => {
    render(
      <MockedProvider mocks={[makeTokenInfoMock()]}>
        <InviteContent />
      </MockedProvider>,
    );
    await screen.findByText('Awesome Project');
    expect(screen.getByText('Maya Chen')).toBeInTheDocument();
    expect(screen.getByText(/Engineer/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Sign up to collaborate' }),
    ).toHaveAttribute('href', '/signup?invite_token=test-token-123');
  });

  it('shows login link with redirect preserved for unauthenticated user', async () => {
    render(
      <MockedProvider mocks={[makeTokenInfoMock()]}>
        <InviteContent />
      </MockedProvider>,
    );
    await screen.findByText('Awesome Project');
    const signinLink = screen.getByRole('link', { name: 'Sign in' });
    expect(signinLink).toHaveAttribute(
      'href',
      '/login?redirect=/invite/test-token-123',
    );
  });

  it('auto-redeems token and shows success for authenticated user', async () => {
    mockIsAuthenticated = true;
    mockAuthUser = {
      id: 'u1',
      username: 'janedoe',
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      onboardingCompleted: true,
    };

    render(
      <MockedProvider mocks={[makeTokenInfoMock(), REDEEM_SUCCESS_MOCK]}>
        <InviteContent />
      </MockedProvider>,
    );

    expect(await screen.findByText("You're in")).toBeInTheDocument();
    expect(screen.getByText(/pending collaborator/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View Project' }),
    ).toHaveAttribute('href', '/project/proj-1');
  });

  it('shows error when token redemption fails (already redeemed)', async () => {
    mockIsAuthenticated = true;
    mockAuthUser = {
      id: 'u1',
      username: 'janedoe',
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      onboardingCompleted: true,
    };

    render(
      <MockedProvider
        mocks={[
          makeTokenInfoMock(),
          {
            request: {
              query: REDEEM_INVITE_TOKEN,
              variables: { token: 'test-token-123' },
            },
            error: new Error('Already a collaborator on this project'),
          },
        ]}
      >
        <InviteContent />
      </MockedProvider>,
    );

    expect(await screen.findByText('Invite not valid')).toBeInTheDocument();
    expect(screen.getByText(/already a collaborator/i)).toBeInTheDocument();
  });
});
