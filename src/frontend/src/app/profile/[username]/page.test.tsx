import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import ProfilePage from './page';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import { GET_BURN_SUMMARY } from '@/lib/graphql/queries/burn';

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
  agentTools: ['Claude Code', 'Cursor'],
  agentWorkflowStyle: 'pair',  // backend sends lowercase enum values
  humanAgentRatio: 0.45,
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
