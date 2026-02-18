import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Control loading / data / error state across tests
const mockFetchMore = vi.fn();
let mockQueryLoading = true;
let mockQueryData: Record<string, unknown> | null = null;
let mockQueryError: Error | null = null;

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: mockQueryData,
    loading: mockQueryLoading,
    error: mockQueryError,
    fetchMore: mockFetchMore,
  }),
}));

import ProjectsPage from './page';

const PAGE_SIZE = 12;

function makeProject(n: number) {
  return {
    id: `proj-${n}`,
    title: `Project ${n}`,
    description: `Description for project ${n}`,
    status: n % 2 === 0 ? 'SHIPPED' : 'IN_PROGRESS',
    role: 'creator',
    techStack: ['Next.js'],
    githubStars: n * 10,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

const FULL_PAGE = Array.from({ length: PAGE_SIZE }, (_, i) => makeProject(i + 1));
const PARTIAL_PAGE = Array.from({ length: 4 }, (_, i) => makeProject(i + 1));

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryLoading = true;
    mockQueryData = null;
    mockQueryError = null;
  });

  it('renders skeleton cards while loading', () => {
    mockQueryLoading = true;
    mockQueryData = null;
    render(<ProjectsPage />);
    expect(document.querySelector('[data-testid="projects-skeleton"]')).toBeInTheDocument();
  });

  it('renders a grid of ProjectCard components when data is present', async () => {
    mockQueryLoading = false;
    mockQueryData = { projects: PARTIAL_PAGE };
    render(<ProjectsPage />);
    expect(await screen.findByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
    expect(screen.getByText('Project 3')).toBeInTheDocument();
    expect(screen.getByText('Project 4')).toBeInTheDocument();
  });

  it('shows an error state when the query fails', async () => {
    mockQueryLoading = false;
    mockQueryData = null;
    mockQueryError = new Error('Network error');
    render(<ProjectsPage />);
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('shows a Load more button when a full page of results is returned', async () => {
    mockQueryLoading = false;
    mockQueryData = { projects: FULL_PAGE };
    render(<ProjectsPage />);
    expect(await screen.findByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('does not show Load more when fewer results than page size are returned', async () => {
    mockQueryLoading = false;
    mockQueryData = { projects: PARTIAL_PAGE };
    render(<ProjectsPage />);
    await screen.findByText('Project 1');
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('calls fetchMore with updated offset when Load more is clicked', async () => {
    const user = userEvent.setup();
    mockQueryLoading = false;
    mockQueryData = { projects: FULL_PAGE };
    render(<ProjectsPage />);
    await user.click(await screen.findByRole('button', { name: /load more/i }));
    expect(mockFetchMore).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ offset: PAGE_SIZE }),
      }),
    );
  });

  it('renders the page heading', async () => {
    mockQueryLoading = false;
    mockQueryData = { projects: PARTIAL_PAGE };
    render(<ProjectsPage />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders an empty state when no projects are returned', async () => {
    mockQueryLoading = false;
    mockQueryData = { projects: [] };
    render(<ProjectsPage />);
    expect(await screen.findByText(/no projects/i)).toBeInTheDocument();
  });
});
