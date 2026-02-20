import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ─── Hoisted mocks ─── */

const mockPush = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'project-1' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      project: {
        id: 'project-1',
        title: 'Nomad Finance',
        description: 'Banking for the nomadic generation.',
        status: 'SHIPPED' as const,
        role: null,
        techStack: [],
        links: {},
        impactMetrics: {},
        githubRepoFullName: null,
        githubStars: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        domains: [],
        aiTools: [],
        buildStyle: [],
        services: [],
        owner: {
          id: 'owner-1',
          username: 'nomaddev',
          displayName: 'Nomad Dev',
          avatarUrl: null,
          headline: null,
          primaryRole: null,
        },
        collaborators: [],
      },
    },
    loading: false,
    error: undefined,
  }),
}));

vi.mock('@/components/features/edit-project-dialog', () => ({
  EditProjectDialog: ({
    open,
    onDeleted,
  }: {
    open: boolean;
    onDeleted?: () => void;
  }) => (
    <div data-testid="edit-project-dialog" data-open={open}>
      <button data-testid="trigger-delete" onClick={onDeleted}>
        Delete
      </button>
    </div>
  ),
}));

/* ─── Import AFTER mocks ─── */

import ProjectPageContent from './project-content';

/* ─── Tests ─── */

describe('ProjectContent owner detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows action bar when authUser.id matches owner.id', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'owner-1', username: 'nomaddev', displayName: 'Nomad Dev', email: 'n@d.com', onboardingCompleted: true },
      accessToken: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    expect(screen.getByTestId('owner-action-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeInTheDocument();
  });

  it('hides action bar when authUser.id does NOT match owner.id', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'visitor-99', username: 'visitor', displayName: 'Visitor', email: 'v@d.com', onboardingCompleted: true },
      accessToken: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('owner-action-bar')).not.toBeInTheDocument();
  });

  it('hides action bar when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('owner-action-bar')).not.toBeInTheDocument();
  });

  it('does not render EditProjectDialog for visitors', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('edit-project-dialog')).not.toBeInTheDocument();
  });

  it('renders EditProjectDialog closed by default for owner', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'owner-1', username: 'nomaddev', displayName: 'Nomad Dev', email: 'n@d.com', onboardingCompleted: true },
      accessToken: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    const dialog = screen.getByTestId('edit-project-dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
  });

  it('opens EditProjectDialog when Edit Project button is clicked', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'owner-1', username: 'nomaddev', displayName: 'Nomad Dev', email: 'n@d.com', onboardingCompleted: true },
      accessToken: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    await user.click(screen.getByRole('button', { name: 'Edit Project' }));

    const dialog = screen.getByTestId('edit-project-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
  });

  it('redirects to owner profile when onDeleted is called', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'owner-1', username: 'nomaddev', displayName: 'Nomad Dev', email: 'n@d.com', onboardingCompleted: true },
      accessToken: 'tok',
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ProjectPageContent />);
    await user.click(screen.getByTestId('trigger-delete'));

    expect(mockPush).toHaveBeenCalledWith('/profile/nomaddev');
  });
});
