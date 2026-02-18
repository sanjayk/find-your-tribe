import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import FeedPage from './page';
import { GET_FEED } from '@/lib/graphql/queries/feed';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFeed = [
  {
    id: 'e1',
    eventType: 'PROJECT_SHIPPED',
    targetType: 'PROJECT',
    targetId: 'p1',
    metadata: { title: 'Tribe Finder', actor_name: 'Maya Chen' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    eventType: 'TRIBE_CREATED',
    targetType: 'TRIBE',
    targetId: 't1',
    metadata: { name: 'Buildspace Alumni', actor_name: 'James Okafor' },
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
];

const mocks = [
  {
    request: { query: GET_FEED, variables: { limit: 20, offset: 0 } },
    result: { data: { feed: mockFeed } },
  },
];

describe('FeedPage', () => {
  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={mocks}>
        <FeedPage />
      </MockedProvider>,
    );
    expect(document.querySelector('[data-testid="feed-skeleton"]')).toBeInTheDocument();
  });

  it('renders feed header after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <FeedPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('The Feed')).toBeInTheDocument();
  });

  it('renders feed events', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <FeedPage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Tribe Formed')).toBeInTheDocument();
  });

  it('renders empty state when no events', async () => {
    const emptyMocks = [
      {
        request: { query: GET_FEED, variables: { limit: 20, offset: 0 } },
        result: { data: { feed: [] } },
      },
    ];
    render(
      <MockedProvider mocks={emptyMocks}>
        <FeedPage />
      </MockedProvider>,
    );
    expect(await screen.findByText(/nothing here yet/i)).toBeInTheDocument();
  });
});
