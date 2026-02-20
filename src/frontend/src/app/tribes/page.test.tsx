import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import TribesPage from './page';
import { GET_TRIBES, SEARCH_TRIBES } from '@/lib/graphql/queries/tribes';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockTribes = [
  {
    id: 'tribe-1',
    name: 'Pixel Architects',
    mission: 'Building beautiful interfaces for the modern web',
    status: 'OPEN',
    maxMembers: 5,
    createdAt: '2025-01-01T00:00:00Z',
    owner: { id: 'u1', displayName: 'Maya Chen', avatarUrl: null },
    members: [
      { user: { id: 'u1', displayName: 'Maya Chen', avatarUrl: null }, role: 'OWNER', status: 'ACTIVE' },
      { user: { id: 'u2', displayName: 'Alex Kim', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
      { user: { id: 'u3', displayName: 'Sam Lee', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
    ],
    openRoles: [
      { id: 'r1', title: 'Frontend Engineer', skillsNeeded: ['React'], filled: false },
      { id: 'r2', title: 'Designer', skillsNeeded: ['Figma'], filled: false },
    ],
  },
  {
    id: 'tribe-2',
    name: 'Data Nomads',
    mission: 'Exploring data pipelines and ML infrastructure',
    status: 'ACTIVE',
    maxMembers: 4,
    createdAt: '2025-02-01T00:00:00Z',
    owner: { id: 'u4', displayName: 'Jordan Park', avatarUrl: null },
    members: [
      { user: { id: 'u4', displayName: 'Jordan Park', avatarUrl: null }, role: 'OWNER', status: 'ACTIVE' },
      { user: { id: 'u5', displayName: 'Riley Brooks', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
      { user: { id: 'u6', displayName: 'Casey Wong', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
      { user: { id: 'u7', displayName: 'Drew Taylor', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
    ],
    openRoles: [],
  },
  {
    id: 'tribe-3',
    name: 'Cloud Wanderers',
    mission: 'Shipped our infra project and moved on',
    status: 'ALUMNI',
    maxMembers: 3,
    createdAt: '2024-06-01T00:00:00Z',
    owner: { id: 'u8', displayName: 'Morgan Liu', avatarUrl: null },
    members: [
      { user: { id: 'u8', displayName: 'Morgan Liu', avatarUrl: null }, role: 'OWNER', status: 'ACTIVE' },
      { user: { id: 'u9', displayName: 'Taylor Reed', avatarUrl: null }, role: 'MEMBER', status: 'ACTIVE' },
    ],
    openRoles: [],
  },
];

const defaultMocks = [
  {
    request: { query: GET_TRIBES, variables: { limit: 20, offset: 0 } },
    result: { data: { tribes: mockTribes } },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPage(mocks: any[] = defaultMocks) {
  return render(
    <MockedProvider mocks={mocks}>
      <TribesPage />
    </MockedProvider>,
  );
}

describe('TribesPage', () => {
  it('renders heading "Find your people"', async () => {
    renderPage();
    expect(await screen.findByText('Find your people')).toBeInTheDocument();
  });

  it('renders search bar with placeholder', async () => {
    renderPage();
    expect(await screen.findByPlaceholderText('Python, hotel, designer...')).toBeInTheDocument();
  });

  it('renders tribe rows with name and mission', async () => {
    renderPage();
    expect(await screen.findByText('Pixel Architects')).toBeInTheDocument();
    expect(screen.getByText('Data Nomads')).toBeInTheDocument();
    expect(screen.getByText('Cloud Wanderers')).toBeInTheDocument();
    // Missions are shown in quotes
    expect(screen.getByText(/Building beautiful interfaces/)).toBeInTheDocument();
  });

  it('open tribes show "Seeking:" line with role titles', async () => {
    renderPage();
    await screen.findByText('Pixel Architects');
    expect(screen.getByText(/Seeking:/)).toBeInTheDocument();
    expect(screen.getByText(/Frontend Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Designer/)).toBeInTheDocument();
  });

  it('shows results count', async () => {
    renderPage();
    await screen.findByText('Pixel Architects');
    expect(screen.getByText('3 tribes')).toBeInTheDocument();
  });

  it('shows empty state when no results', async () => {
    const emptyMocks = [
      {
        request: { query: GET_TRIBES, variables: { limit: 20, offset: 0 } },
        result: { data: { tribes: [] } },
      },
    ];
    renderPage(emptyMocks);
    expect(await screen.findByText('No tribes yet')).toBeInTheDocument();
  });

  it('"Load more" button renders when more results available', async () => {
    // Return exactly PAGE_SIZE items to indicate more may exist
    const manyTribes = Array.from({ length: 20 }, (_, i) => ({
      ...mockTribes[0],
      id: `tribe-${i}`,
      name: `Tribe ${i}`,
    }));
    const mocks = [
      {
        request: { query: GET_TRIBES, variables: { limit: 20, offset: 0 } },
        result: { data: { tribes: manyTribes } },
      },
    ];
    renderPage(mocks);
    await screen.findByText('Tribe 0');
    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('tribe rows link to /tribe/[id]', async () => {
    renderPage();
    await screen.findByText('Pixel Architects');
    const link = screen.getByText('Pixel Architects').closest('a');
    expect(link).toHaveAttribute('href', '/tribe/tribe-1');
  });

  it('renders overline text "TRIBES"', async () => {
    renderPage();
    expect(await screen.findByText('TRIBES')).toBeInTheDocument();
  });

  it('shows search results with query context', async () => {
    const searchMocks = [
      {
        request: { query: GET_TRIBES, variables: { limit: 20, offset: 0 } },
        result: { data: { tribes: mockTribes } },
      },
      {
        request: { query: SEARCH_TRIBES, variables: { query: 'pixel', limit: 20, offset: 0 } },
        result: { data: { searchTribes: [mockTribes[0]] } },
      },
    ];

    renderPage(searchMocks);
    await screen.findByText('Pixel Architects');

    const input = screen.getByPlaceholderText('Python, hotel, designer...');
    await userEvent.type(input, 'pixel');

    // Wait for debounced search results
    expect(await screen.findByText(/1 tribe matching/)).toBeInTheDocument();
  });
});
