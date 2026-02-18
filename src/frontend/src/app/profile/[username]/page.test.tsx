import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import ProfilePage from './page';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';

vi.mock('next/navigation', () => ({
  useParams: () => ({ username: 'mayachen' }),
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
  contactLinks: { twitter: '@maya_ships', website: 'https://mayachen.dev' },
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

const mocks = [
  {
    request: { query: GET_BUILDER, variables: { username: 'mayachen' } },
    result: { data: { user: mockBuilder } },
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
    expect(screen.getByText('Building Activity')).toBeInTheDocument();
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
    expect(screen.getByText(/witnessed by/i)).toBeInTheDocument();
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
});
