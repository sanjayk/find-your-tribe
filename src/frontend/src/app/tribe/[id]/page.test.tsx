import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import TribePage from './page';
import { GET_TRIBE } from '@/lib/graphql/queries/tribes';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'tribe-1' }),
}));

const mockTribe = {
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
        avatarUrl: null,
        headline: 'Full-stack engineer building with AI',
        primaryRole: 'ENGINEER',
      },
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: '2025-06-01T00:00:00Z',
    },
    {
      user: {
        id: 'u2',
        username: 'jamesokafor',
        displayName: 'James Okafor',
        avatarUrl: null,
        headline: 'Product Designer',
        primaryRole: 'DESIGNER',
      },
      role: 'MEMBER',
      status: 'ACTIVE',
      joinedAt: '2025-07-15T00:00:00Z',
    },
  ],
  openRoles: [
    {
      id: 'r1',
      title: 'Backend Engineer',
      skillsNeeded: ['Python', 'PostgreSQL'],
      filled: false,
    },
  ],
};

const mocks = [
  {
    request: { query: GET_TRIBE, variables: { id: 'tribe-1' } },
    result: { data: { tribe: mockTribe } },
  },
];

describe('TribePage', () => {
  it('renders loading skeleton initially', () => {
    render(
      <MockedProvider mocks={mocks}>
        <TribePage />
      </MockedProvider>,
    );
    expect(document.querySelector('[data-testid="tribe-skeleton"]')).toBeInTheDocument();
  });

  it('renders tribe name after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <TribePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Buildspace Alumni')).toBeInTheDocument();
  });

  it('renders tribe mission', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <TribePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Ship together, grow together')).toBeInTheDocument();
  });

  it('renders members section with member names', async () => {
    render(
      <MockedProvider mocks={mocks}>
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
      <MockedProvider mocks={mocks}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByText('Open Roles')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders member count', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <TribePage />
      </MockedProvider>,
    );
    await screen.findByText('Buildspace Alumni');
    expect(screen.getByText('2 / 12 members')).toBeInTheDocument();
  });

  it('renders not-found for missing tribe', async () => {
    const notFoundMocks = [
      {
        request: { query: GET_TRIBE, variables: { id: 'tribe-1' } },
        result: { data: { tribe: null } },
      },
    ];
    render(
      <MockedProvider mocks={notFoundMocks}>
        <TribePage />
      </MockedProvider>,
    );
    expect(await screen.findByText('Tribe not found')).toBeInTheDocument();
  });
});
