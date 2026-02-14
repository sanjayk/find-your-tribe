import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import DiscoverPage from './page';
import { GET_BUILDERS } from '@/lib/graphql/queries/builders';

const mockBuilders = [
  {
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
    skills: [{ id: '1', name: 'React', slug: 'react' }],
  },
];

const mocks = [
  {
    request: { query: GET_BUILDERS, variables: { limit: 12, offset: 0 } },
    result: { data: { builders: mockBuilders } },
  },
];

describe('DiscoverPage', () => {
  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={mocks}>
        <DiscoverPage />
      </MockedProvider>,
    );
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders page heading after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <DiscoverPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Discover Builders')).toBeInTheDocument();
  });

  it('renders builder cards', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <DiscoverPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Maya Chen')).toBeInTheDocument();
  });
});
