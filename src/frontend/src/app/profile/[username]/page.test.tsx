import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import ProfilePage from './profile-content';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import { GET_BURN_SUMMARY } from '@/lib/graphql/queries/burn';
import { MY_PENDING_INVITATIONS } from '@/lib/graphql/queries/invitations';
import { CONFIRM_COLLABORATION, DECLINE_COLLABORATION } from '@/lib/graphql/mutations/projects';

vi.mock('next/navigation', () => ({
  useParams: () => ({ username: 'mayachen' }),
  useRouter: () => ({ push: vi.fn() }),
}));

let mockAuthUser: { id: string; username: string; displayName: string; email: string; onboardingCompleted: boolean } | null = null;

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

// Mock canvas getContext for sparkline/heatmap components
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
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  });

  // Mock getBoundingClientRect for canvas sizing
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width: 200,
    height: 40,
    top: 0,
    left: 0,
    right: 200,
    bottom: 40,
  });

  // Reset auth mock
  mockAuthUser = null;
});

const mockBuilder = {
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
  contactLinks: { X: 'https://x.com/maya_ships', Portfolio: 'https://mayachen.dev' },
  githubUsername: 'mayachen',
  agentTools: { editors: ['Cursor'], agents: ['Claude Code'], models: ['Claude Sonnet'], workflowStyles: ['Pair builder'], setupNote: 'I pair with Claude all day' },
  agentWorkflowStyle: null,
  humanAgentRatio: 0.45,
  preferences: {},
  createdAt: '2025-01-01T00:00:00Z',
  skills: [
    { id: '1', name: 'React', slug: 'react', category: 'ENGINEERING' },
    { id: '2', name: 'Python', slug: 'python', category: 'ENGINEERING' },
  ],
  projects: [
    {
      id: 'p1',
      title: 'Tribe Finder',
      description: 'Find your people based on what you build',
      status: 'IN_PROGRESS',
      role: 'creator',
      techStack: ['Next.js', 'Python'],
      links: {},
      impactMetrics: {},
      githubRepoFullName: 'mayachen/tribe-finder',
      githubStars: 142,
      createdAt: '2025-06-01T00:00:00Z',
      updatedAt: '2025-12-01T00:00:00Z',
      collaborators: [
        { user: { id: '1', username: 'mayachen', displayName: 'Maya Chen', avatarUrl: null, headline: 'Full-stack engineer building with AI', primaryRole: 'ENGINEER' }, role: 'creator', status: 'ACTIVE' },
        { user: { id: '2', username: 'jamesokafor', displayName: 'James Okafor', avatarUrl: null, headline: 'Product Designer', primaryRole: 'DESIGNER' }, role: 'design', status: 'ACTIVE' },
      ],
    },
    {
      id: 'p2',
      title: 'AI Resume Builder',
      description: 'AI-powered resume optimization',
      status: 'SHIPPED',
      role: 'creator',
      techStack: ['React', 'OpenAI'],
      links: {},
      impactMetrics: {},
      githubRepoFullName: null,
      githubStars: null,
      createdAt: '2025-03-01T00:00:00Z',
      updatedAt: '2025-08-01T00:00:00Z',
      collaborators: [],
    },
  ],
  tribes: [
    {
      id: 't1',
      name: 'Buildspace Alumni',
      mission: 'Ship together',
      status: 'ACTIVE',
      maxMembers: 12,
      members: [
        { user: { id: '1', username: 'mayachen', displayName: 'Maya Chen', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
      ],
      openRoles: [],
    },
  ],
};

const mockBurnSummary = {
  daysActive: 120,
  totalTokens: 850000,
  activeWeeks: 38,
  totalWeeks: 52,
  weeklyStreak: 5,
  dailyActivity: [
    { date: '2025-06-01', tokens: 5000 },
    { date: '2025-06-02', tokens: 12000 },
    { date: '2025-06-03', tokens: 0 },
    { date: '2025-06-04', tokens: 8000 },
  ],
};

const emptyInvitationsMock = {
  request: { query: MY_PENDING_INVITATIONS },
  result: { data: { myPendingInvitations: [] } },
};

const mocks = [
  {
    request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
    result: { data: { user: mockBuilder } },
  },
  {
    request: { query: GET_BURN_SUMMARY, variables: { userId: '1', weeks: 52 } },
    result: { data: { burnSummary: mockBurnSummary } },
  },
];

describe('ProfilePage', () => {
  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(document.querySelector('[data-testid="profile-skeleton"]')).toBeInTheDocument();
  });

  it('renders builder name and handle after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Maya Chen')).toBeInTheDocument();
    // Handle appears in hero identity and footer links — check the h1's sibling
    const handles = await screen.findAllByText(/@mayachen/);
    expect(handles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders headline', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Full-stack engineer building with AI')).toBeInTheDocument();
  });

  it('renders bio below headline', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Building cool things.')).toBeInTheDocument();
  });

  it('hides bio when not provided', async () => {
    const noBioBuilder = { ...mockBuilder, bio: null };
    const noBioMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: noBioBuilder } },
      },
    ];
    render(
      <MockedProvider mocks={noBioMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.queryByText('Building cool things.')).not.toBeInTheDocument();
  });

  it('shows own-profile nudge when headline and bio are both empty', async () => {
    mockAuthUser = {
      id: '1',
      username: 'mayachen',
      displayName: 'Maya Chen',
      email: 'maya@test.com',
      onboardingCompleted: true,
    };
    const emptyBuilder = { ...mockBuilder, headline: null, bio: null };
    const emptyMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: emptyBuilder } },
      },
      emptyInvitationsMock,
    ];
    render(
      <MockedProvider mocks={emptyMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText('Tell the community what you build and how you work.')).toBeInTheDocument();
    expect(screen.getByText('Complete profile')).toBeInTheDocument();
    expect(screen.getByText('Complete profile').closest('a')).toHaveAttribute('href', '/settings');
  });

  it('shows visitor placeholder when headline and bio are empty on another profile', async () => {
    mockAuthUser = null;
    const emptyBuilder = { ...mockBuilder, headline: null, bio: null };
    const emptyMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: emptyBuilder } },
      },
    ];
    render(
      <MockedProvider mocks={emptyMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText(/hasn\u2019t shared their story yet/)).toBeInTheDocument();
    expect(screen.queryByText('Complete profile')).not.toBeInTheDocument();
  });

  it('renders the burn heatmap', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText('Building activity')).toBeInTheDocument();
  });

  it('renders proof of work section', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText('Proof of Work')).toBeInTheDocument();
    // Tribe Finder appears in hero card and witness section
    const tribeFinders = screen.getAllByText('Tribe Finder');
    expect(tribeFinders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders witnessed by section with collaborators', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText(/collaborators/i)).toBeInTheDocument();
    expect(screen.getByText('James Okafor')).toBeInTheDocument();
  });

  it('renders profile footer with tribes', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.getByText('Buildspace Alumni')).toBeInTheDocument();
  });

  it('renders not-found for missing user', async () => {
    const notFoundMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: null } },
      },
    ];
    render(
      <MockedProvider mocks={notFoundMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Builder not found')).toBeInTheDocument();
  });

  it('renders empty projects state with "Nothing shipped yet"', async () => {
    const emptyProjectsBuilder = { ...mockBuilder, projects: [], tribes: [] };
    const emptyMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: emptyProjectsBuilder } },
      },
    ];
    render(
      <MockedProvider mocks={emptyMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Nothing shipped yet')).toBeInTheDocument();
  });

  it('shows self-view hint when viewing own empty profile', async () => {
    mockAuthUser = {
      id: '1',
      username: 'mayachen',
      displayName: 'Maya Chen',
      email: 'maya@test.com',
      onboardingCompleted: true,
    };
    const emptyProjectsBuilder = { ...mockBuilder, projects: [], tribes: [] };
    const emptyMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: emptyProjectsBuilder } },
      },
      emptyInvitationsMock,
    ];
    render(
      <MockedProvider mocks={emptyMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Your proof of work will show up here')).toBeInTheDocument();
  });

  it('does not show self-view hint when viewing another profile', async () => {
    mockAuthUser = {
      id: '99',
      username: 'otheruser',
      displayName: 'Other User',
      email: 'other@test.com',
      onboardingCompleted: true,
    };
    const emptyProjectsBuilder = { ...mockBuilder, projects: [], tribes: [] };
    const emptyMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: emptyProjectsBuilder } },
      },
    ];
    render(
      <MockedProvider mocks={emptyMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Nothing shipped yet');
    expect(screen.queryByText('Your proof of work will show up here')).not.toBeInTheDocument();
  });
});

interface MockedInvitation {
  projectId: string;
  projectTitle: string;
  role: string | null;
  inviter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: null;
    headline: string;
    primaryRole: string;
  };
  invitedAt: string;
}

describe('ProfilePage — Pending Invitations', () => {
  const mockInvitation: MockedInvitation = {
    projectId: 'proj-99',
    projectTitle: 'Open Source Dashboard',
    role: 'engineer',
    inviter: {
      id: 'user-2',
      username: 'alexsmith',
      displayName: 'Alex Smith',
      avatarUrl: null,
      headline: 'Backend engineer',
      primaryRole: 'ENGINEER',
    },
    invitedAt: '2026-01-15T10:00:00Z',
  };

  const makeOwnProfileMocks = (
    invitations: MockedInvitation[],
    extraMocks: MockedResponse[] = [],
  ): MockedResponse[] => [
    {
      request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
      result: { data: { user: mockBuilder } },
    },
    {
      request: { query: MY_PENDING_INVITATIONS },
      result: { data: { myPendingInvitations: invitations } },
    },
    ...extraMocks,
  ];

  beforeEach(() => {
    mockAuthUser = {
      id: '1',
      username: 'mayachen',
      displayName: 'Maya Chen',
      email: 'maya@test.com',
      onboardingCompleted: true,
    };
  });

  it('renders pending invitations section on own profile when invitations exist', async () => {
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation])}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByTestId('invitation-card')).toBeInTheDocument();
  });

  it('shows inviter name in the invitation card', async () => {
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');
    expect(screen.getByText('Alex Smith')).toBeInTheDocument();
  });

  it('shows project title as a link in the invitation card', async () => {
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');
    const link = screen.getByRole('link', { name: 'Open Source Dashboard' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/project/proj-99');
  });

  it('shows role label when role is provided', async () => {
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');
    expect(screen.getByText(/Role: engineer/)).toBeInTheDocument();
  });

  it('hides role label when role is null', async () => {
    const noRoleInvitation = { ...mockInvitation, role: null };
    render(
      <MockedProvider mocks={makeOwnProfileMocks([noRoleInvitation])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');
    expect(screen.queryByText(/Role:/)).not.toBeInTheDocument();
  });

  it('renders Accept and Decline buttons for each invitation', async () => {
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('hides pending invitations section when invitation list is empty on own profile', async () => {
    render(
      <MockedProvider mocks={makeOwnProfileMocks([])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
  });

  it('hides pending invitations section when viewing another profile', async () => {
    mockAuthUser = {
      id: '99',
      username: 'otheruser',
      displayName: 'Other User',
      email: 'other@test.com',
      onboardingCompleted: true,
    };
    const visitorMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: mockBuilder } },
      },
      // MY_PENDING_INVITATIONS should NOT fire — no mock needed
    ];
    render(
      <MockedProvider mocks={visitorMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Maya Chen');
    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invitation-card')).not.toBeInTheDocument();
  });

  it('removes invitation card after clicking Accept', async () => {
    const confirmMock = {
      request: { query: CONFIRM_COLLABORATION, variables: { projectId: 'proj-99' } },
      result: {
        data: {
          projects: {
            confirmCollaboration: {
              user: { id: 'user-1', username: 'mayachen', displayName: 'Maya Chen' },
              role: 'engineer',
              status: 'confirmed',
              confirmedAt: '2026-01-16T10:00:00Z',
            },
          },
        },
      },
    };
    const refetchMock = {
      request: { query: MY_PENDING_INVITATIONS },
      result: { data: { myPendingInvitations: [] } },
    };
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation], [confirmMock, refetchMock])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(screen.queryByTestId('invitation-card')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('removes invitation card after clicking Decline', async () => {
    const declineMock = {
      request: { query: DECLINE_COLLABORATION, variables: { projectId: 'proj-99' } },
      result: { data: { projects: { declineCollaboration: true } } },
    };
    const refetchMock = {
      request: { query: MY_PENDING_INVITATIONS },
      result: { data: { myPendingInvitations: [] } },
    };
    render(
      <MockedProvider mocks={makeOwnProfileMocks([mockInvitation], [declineMock, refetchMock])}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Pending Invitations');

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    await waitFor(() => {
      expect(screen.queryByTestId('invitation-card')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

describe('ProfilePage — View All Projects', () => {
  function makeProjectEntry(id: string, title: string) {
    return {
      id,
      title,
      description: `Description for ${title}`,
      status: 'SHIPPED',
      role: 'creator',
      techStack: [],
      links: {},
      impactMetrics: {},
      githubRepoFullName: null,
      githubStars: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-06-01T00:00:00Z',
      collaborators: [],
    };
  }

  it('shows "View all projects" link when builder has more than 7 projects', async () => {
    const manyProjects = Array.from({ length: 8 }, (_, i) =>
      makeProjectEntry(`proj-${i}`, `Project ${i + 1}`)
    );
    const manyProjectsBuilder = { ...mockBuilder, projects: manyProjects };
    const builderMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: manyProjectsBuilder } },
      },
    ];
    render(
      <MockedProvider mocks={builderMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Project 1');
    const link = screen.getByRole('link', { name: /View all projects/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/projects?builder=mayachen');
  });

  it('hides "View all projects" link when builder has 7 or fewer projects', async () => {
    const sevenProjects = Array.from({ length: 7 }, (_, i) =>
      makeProjectEntry(`proj-${i}`, `Project ${i + 1}`)
    );
    const sevenProjectsBuilder = { ...mockBuilder, projects: sevenProjects };
    const builderMocks = [
      {
        request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
        result: { data: { user: sevenProjectsBuilder } },
      },
    ];
    render(
      <MockedProvider mocks={builderMocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    await screen.findByText('Project 1');
    expect(screen.queryByRole('link', { name: /View all projects/i })).not.toBeInTheDocument();
  });
});
