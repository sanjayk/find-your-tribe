import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import TribePage from './tribe-content';
import { GET_TRIBE } from '@/lib/graphql/queries/tribes';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'tribe-1' }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const baseTribe = {
  id: 'tribe-1',
  name: 'Buildspace Alumni',
  mission: 'Ship together, grow together',
  status: 'OPEN',
  maxMembers: 12,
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2025-12-01T00:00:00Z',
  owner: {
    id: 'u1',
    username: 'mayachen',
    displayName: 'Maya Chen',
    avatarUrl: null,
    headline: 'Full-stack engineer building with AI',
    primaryRole: 'ENGINEER',
  },
  members: [
    {
      user: {
        id: 'u1',
        username: 'mayachen',
        displayName: 'Maya Chen',
        avatarUrl: null as string | null,
        headline: 'Full-stack engineer building with AI' as string | null,
        primaryRole: 'ENGINEER' as string | null,
      },
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: '2025-06-01T00:00:00Z' as string | null,
    },
    {
      user: {
        id: 'u2',
        username: 'jamesokafor',
        displayName: 'James Okafor',
        avatarUrl: null as string | null,
        headline: 'Product Designer' as string | null,
        primaryRole: 'DESIGNER' as string | null,
      },
      role: 'MEMBER',
      status: 'ACTIVE',
      joinedAt: '2025-07-15T00:00:00Z' as string | null,
    },
  ],
  openRoles: [
    {
      id: 'r1',
      title: 'Backend Engineer',
      skillsNeeded: ['Python', 'PostgreSQL'],
      filled: false,
    },
    {
      id: 'r2',
      title: 'Growth Lead',
      skillsNeeded: ['Marketing'],
      filled: true,
    },
  ],
};

function makeMocks(tribeOverrides?: Partial<typeof baseTribe> | null) {
  const tribe = tribeOverrides === null ? null : { ...baseTribe, ...tribeOverrides };
  return [
    {
      request: { query: GET_TRIBE, variables: { id: 'tribe-1' } },
      result: { data: { tribe } },
    },
  ];
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

describe('TribePage', () => {
  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    expect(document.querySelector('[data-testid="tribe-skeleton"]')).toBeInTheDocument();
  });

  it('renders tribe name after loading', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Buildspace Alumni')).toBeInTheDocument();
  });

  it('renders tribe mission', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Ship together, grow together')).toBeInTheDocument();
  });

  it('renders members section with member names', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Maya Chen')).toBeInTheDocument();
    expect(screen.getByText('James Okafor')).toBeInTheDocument();
  });

  it('renders open roles', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByText('Open Roles')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders member count', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByText('2 / 12 members')).toBeInTheDocument();
  });

  it('renders not-found for missing tribe', async () => {
    render(
      <MockedProvider mocks={makeMocks(null)}>
        <TribePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Tribe not found')).toBeInTheDocument();
  });
});

describe('TribePage — open roles join buttons', () => {
  it('shows Request to Join for unauthenticated visitor on unfilled roles', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByRole('button', { name: 'Request to Join' })).toBeInTheDocument();
  });

  it('shows Request Pending for user with pending status', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u3', username: 'pending-user', displayName: 'Pending User', email: 'p@test.com', onboardingCompleted: true },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
    });

    const tribeWithPending = {
      members: [
        ...baseTribe.members,
        {
          user: {
            id: 'u3',
            username: 'pending-user',
            displayName: 'Pending User',
            avatarUrl: null,
            headline: null,
            primaryRole: null,
          },
          role: 'MEMBER',
          status: 'PENDING',
          joinedAt: null,
        },
      ],
    };

    render(
      <MockedProvider mocks={makeMocks(tribeWithPending)}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByRole('button', { name: 'Request Pending' })).toBeDisabled();
  });

  it('hides join button for active members', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', username: 'jamesokafor', displayName: 'James Okafor', email: 'j@test.com', onboardingCompleted: true },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.queryByRole('button', { name: 'Request to Join' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Pending' })).not.toBeInTheDocument();
  });

  it('shows Role Filled text for filled roles', async () => {
    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByText('Role Filled')).toBeInTheDocument();
    expect(screen.getByText('Growth Lead')).toBeInTheDocument();
  });

  it('hides join buttons when tribe status is not open', async () => {
    render(
      <MockedProvider mocks={makeMocks({ status: 'ACTIVE' })}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.queryByRole('button', { name: 'Request to Join' })).not.toBeInTheDocument();
  });
});

describe('TribePage — member action bar', () => {
  it('shows member action bar for non-owner members', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', username: 'jamesokafor', displayName: 'James Okafor', email: 'j@test.com', onboardingCompleted: true },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByTestId('member-action-bar')).toBeInTheDocument();
    expect(screen.getByText(/You're a member of this tribe/)).toBeInTheDocument();
  });

  it('shows Leave Tribe button for members, not for owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', username: 'jamesokafor', displayName: 'James Okafor', email: 'j@test.com', onboardingCompleted: true },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByRole('button', { name: 'Leave Tribe' })).toBeInTheDocument();
  });

  it('does not show Leave Tribe button for owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', username: 'mayachen', displayName: 'Maya Chen', email: 'm@test.com', onboardingCompleted: true },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.queryByRole('button', { name: 'Leave Tribe' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('member-action-bar')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog on Leave Tribe click', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', username: 'jamesokafor', displayName: 'James Okafor', email: 'j@test.com', onboardingCompleted: true },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MockedProvider mocks={makeMocks()}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');

    await user.click(screen.getByRole('button', { name: 'Leave Tribe' }));
    expect(await screen.findByText('Leave this tribe?')).toBeInTheDocument();
    expect(screen.getByText(/need to request to join again/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
