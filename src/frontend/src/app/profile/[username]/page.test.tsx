import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import ProfilePage from './page';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';

vi.mock('next/navigation', () => ({
  useParams: () => ({ username: 'mayachen' }),
}));

const mockBuilder = {
  id: '1',
  username: 'mayachen',
  displayName: 'Maya Chen',
  avatarUrl: null,
  headline: 'Full-stack engineer',
  primaryRole: 'ENGINEER',
  timezone: 'America/Los_Angeles',
  availabilityStatus: 'OPEN_TO_TRIBE',
  builderScore: 72,
  bio: 'Building cool things.',
  contactLinks: {},
  githubUsername: 'mayachen',
  agentTools: ['Claude', 'Cursor'],
  agentWorkflowStyle: 'PAIR',
  humanAgentRatio: 0.45,
  createdAt: '2025-01-01T00:00:00Z',
  skills: [{ id: '1', name: 'React', slug: 'react', category: 'ENGINEERING' }],
  projects: [],
  tribes: [],
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
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders builder name after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ProfilePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Maya Chen')).toBeInTheDocument();
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
