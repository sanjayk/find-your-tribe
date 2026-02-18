import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import ProjectPage from './page';
import { GET_PROJECT } from '@/lib/graphql/queries/projects';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'proj-1' }),
}));

const mockProject = {
  id: 'proj-1',
  title: 'Tribe Finder',
  description: 'Find your people based on what you build',
  status: 'IN_PROGRESS',
  role: 'creator',
  techStack: ['Next.js', 'Python'],
  links: { github: 'https://github.com/example/tribe-finder' },
  impactMetrics: {},
  githubRepoFullName: 'example/tribe-finder',
  githubStars: 142,
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
  collaborators: [
    {
      user: {
        id: 'u2',
        username: 'jamesokafor',
        displayName: 'James Okafor',
        avatarUrl: null,
        headline: 'Product Designer',
        primaryRole: 'DESIGNER',
      },
      role: 'design',
      status: 'CONFIRMED',
    },
  ],
};

const mocks = [
  {
    request: { query: GET_PROJECT, variables: { id: 'proj-1' } },
    result: { data: { project: mockProject } },
  },
];

describe('ProjectPage', () => {
  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    expect(document.querySelector('[data-testid="project-skeleton"]')).toBeInTheDocument();
  });

  it('renders project title after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Tribe Finder')).toBeInTheDocument();
  });

  it('renders project description', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Find your people based on what you build')).toBeInTheDocument();
  });

  it('renders owner section', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    await screen.findByText('Tribe Finder');
    expect(screen.getByText('Created By')).toBeInTheDocument();
    expect(screen.getByText('Maya Chen')).toBeInTheDocument();
  });

  it('renders collaborators', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    await screen.findByText('Tribe Finder');
    expect(screen.getByText('James Okafor')).toBeInTheDocument();
  });

  it('renders tech stack tags', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    await screen.findByText('Tribe Finder');
    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('renders not-found for missing project', async () => {
    const notFoundMocks = [
      {
        request: { query: GET_PROJECT, variables: { id: 'proj-1' } },
        result: { data: { project: null } },
      },
    ];
    render(
      <MockedProvider mocks={notFoundMocks}>
        <ProjectPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Project not found')).toBeInTheDocument();
  });
});
