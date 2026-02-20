import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ─── Hoisted mocks ─── */

const mockPush = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseQuery = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'project-1' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: mockUseQuery,
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

vi.mock('@/components/features/built-with-section', () => ({
  BuiltWithSection: ({
    domains,
    aiTools,
    buildStyle,
    services,
    editable,
  }: {
    domains: string[];
    aiTools: string[];
    buildStyle: string[];
    services: string[];
    editable?: boolean;
  }) => (
    <div
      data-testid="built-with-section"
      data-editable={editable}
      data-domains={domains.join(',')}
      data-ai-tools={aiTools.join(',')}
      data-build-style={buildStyle.join(',')}
      data-services={services.join(',')}
    />
  ),
}));

vi.mock('@/components/features/collaborator-invite', () => ({
  CollaboratorInvite: ({
    projectId,
    existingCollaborators,
  }: {
    projectId: string;
    existingCollaborators: { user: { id: string } }[];
  }) => (
    <div
      data-testid="collaborator-invite"
      data-project-id={projectId}
      data-existing-count={existingCollaborators.length}
    />
  ),
}));

vi.mock('@/components/features/build-timeline', () => ({
  BuildTimeline: ({
    milestones,
    editable,
  }: {
    milestones: { id: string }[];
    editable?: boolean;
  }) => (
    <div
      data-testid="build-timeline"
      data-editable={editable}
      data-count={milestones.length}
    />
  ),
}));

/* ─── Import AFTER mocks ─── */

import ProjectPageContent from './project-content';

/* ─── Helpers ─── */

const BASE_PROJECT = {
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
};

function setProject(overrides: Record<string, unknown> = {}) {
  mockUseQuery.mockReturnValue({
    data: { project: { ...BASE_PROJECT, ...overrides } },
    loading: false,
    error: undefined,
  });
}

function setOwnerAuth() {
  mockUseAuth.mockReturnValue({
    user: { id: 'owner-1', username: 'nomaddev', displayName: 'Nomad Dev', email: 'n@d.com', onboardingCompleted: true },
    accessToken: 'tok',
    isAuthenticated: true,
    isLoading: false,
  });
}

function setVisitorAuth() {
  mockUseAuth.mockReturnValue({
    user: { id: 'visitor-99', username: 'visitor', displayName: 'Visitor', email: 'v@d.com', onboardingCompleted: true },
    accessToken: 'tok',
    isAuthenticated: true,
    isLoading: false,
  });
}

function setUnauthenticated() {
  mockUseAuth.mockReturnValue({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
}

/* ─── Tests ─── */

describe('ProjectContent owner detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setProject();
  });

  it('shows action bar when authUser.id matches owner.id', () => {
    setOwnerAuth();

    render(<ProjectPageContent />);
    expect(screen.getByTestId('owner-action-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeInTheDocument();
  });

  it('hides action bar when authUser.id does NOT match owner.id', () => {
    setVisitorAuth();

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('owner-action-bar')).not.toBeInTheDocument();
  });

  it('hides action bar when user is not authenticated', () => {
    setUnauthenticated();

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('owner-action-bar')).not.toBeInTheDocument();
  });

  it('does not render EditProjectDialog for visitors', () => {
    setUnauthenticated();

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('edit-project-dialog')).not.toBeInTheDocument();
  });

  it('renders EditProjectDialog closed by default for owner', () => {
    setOwnerAuth();

    render(<ProjectPageContent />);
    const dialog = screen.getByTestId('edit-project-dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
  });

  it('opens EditProjectDialog when Edit Project button is clicked', async () => {
    const user = userEvent.setup();
    setOwnerAuth();

    render(<ProjectPageContent />);
    await user.click(screen.getByRole('button', { name: 'Edit Project' }));

    const dialog = screen.getByTestId('edit-project-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
  });

  it('redirects to owner profile when onDeleted is called', async () => {
    const user = userEvent.setup();
    setOwnerAuth();

    render(<ProjectPageContent />);
    await user.click(screen.getByTestId('trigger-delete'));

    expect(mockPush).toHaveBeenCalledWith('/profile/nomaddev');
  });
});

describe('BuiltWithSection integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when project has domains data (visitor)', () => {
    setVisitorAuth();
    setProject({ domains: ['web', 'mobile'] });

    render(<ProjectPageContent />);
    const section = screen.getByTestId('built-with-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('data-editable', 'false');
    expect(section).toHaveAttribute('data-domains', 'web,mobile');
  });

  it('renders when project has aiTools data (visitor)', () => {
    setVisitorAuth();
    setProject({ aiTools: ['Claude', 'Cursor'] });

    render(<ProjectPageContent />);
    expect(screen.getByTestId('built-with-section')).toBeInTheDocument();
  });

  it('hidden when all four arrays are empty (visitor)', () => {
    setVisitorAuth();
    setProject({ domains: [], aiTools: [], buildStyle: [], services: [] });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('built-with-section')).not.toBeInTheDocument();
  });

  it('always shown for owner even if all arrays empty', () => {
    setOwnerAuth();
    setProject({ domains: [], aiTools: [], buildStyle: [], services: [] });

    render(<ProjectPageContent />);
    const section = screen.getByTestId('built-with-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('data-editable', 'true');
  });
});

describe('BuildTimeline integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when milestones exist (visitor)', () => {
    setVisitorAuth();
    setProject({
      milestones: [
        { id: 'm-1', type: 'start', title: 'Kickoff', date: '2024-01-01', description: null },
      ],
    });

    render(<ProjectPageContent />);
    const timeline = screen.getByTestId('build-timeline');
    expect(timeline).toBeInTheDocument();
    expect(timeline).toHaveAttribute('data-editable', 'false');
    expect(timeline).toHaveAttribute('data-count', '1');
  });

  it('hidden when no milestones (visitor)', () => {
    setVisitorAuth();
    setProject({ milestones: [] });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('build-timeline')).not.toBeInTheDocument();
  });

  it('hidden when milestones is undefined (visitor)', () => {
    setVisitorAuth();
    setProject({ milestones: undefined });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('build-timeline')).not.toBeInTheDocument();
  });

  it('always shown for owner even with no milestones', () => {
    setOwnerAuth();
    setProject({ milestones: [] });

    render(<ProjectPageContent />);
    const timeline = screen.getByTestId('build-timeline');
    expect(timeline).toBeInTheDocument();
    expect(timeline).toHaveAttribute('data-editable', 'true');
  });
});

describe('Collaborators section', () => {
  const confirmedCollab = {
    user: {
      id: 'collab-1',
      username: 'alice',
      displayName: 'Alice Builder',
      avatarUrl: null,
      headline: 'Full-stack dev',
      primaryRole: 'ENGINEER',
    },
    role: 'ENGINEER',
    status: 'CONFIRMED',
  };

  const pendingCollab = {
    user: {
      id: 'collab-2',
      username: 'bob',
      displayName: 'Bob Designer',
      avatarUrl: null,
      headline: 'UI designer',
      primaryRole: 'DESIGNER',
    },
    role: 'DESIGNER',
    status: 'PENDING',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('visitor sees only confirmed collaborators', () => {
    setVisitorAuth();
    setProject({ collaborators: [confirmedCollab, pendingCollab] });

    render(<ProjectPageContent />);
    expect(screen.getByText('Alice Builder')).toBeInTheDocument();
    expect(screen.queryByText('Bob Designer')).not.toBeInTheDocument();
  });

  it('visitor does NOT see pending collaborators', () => {
    setVisitorAuth();
    setProject({ collaborators: [pendingCollab] });

    render(<ProjectPageContent />);
    expect(screen.queryByText('Bob Designer')).not.toBeInTheDocument();
  });

  it('owner sees confirmed and pending collaborators', () => {
    setOwnerAuth();
    setProject({ collaborators: [confirmedCollab, pendingCollab] });

    render(<ProjectPageContent />);
    expect(screen.getByText('Alice Builder')).toBeInTheDocument();
    expect(screen.getByText('Bob Designer')).toBeInTheDocument();
  });

  it('pending collaborators shown with Pending badge for owner', () => {
    setOwnerAuth();
    setProject({ collaborators: [pendingCollab] });

    render(<ProjectPageContent />);
    const pendingTexts = screen.getAllByText('Pending');
    // Both the section heading and the badge
    expect(pendingTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Bob Designer')).toBeInTheDocument();
  });

  it('owner sees CollaboratorInvite panel', () => {
    setOwnerAuth();
    setProject({ collaborators: [confirmedCollab] });

    render(<ProjectPageContent />);
    expect(screen.getByTestId('collaborator-invite')).toBeInTheDocument();
  });

  it('visitor does NOT see CollaboratorInvite panel', () => {
    setVisitorAuth();
    setProject({ collaborators: [confirmedCollab] });

    render(<ProjectPageContent />);
    expect(screen.queryByTestId('collaborator-invite')).not.toBeInTheDocument();
  });

  it('section hidden for visitor when no confirmed collaborators', () => {
    setVisitorAuth();
    setProject({ collaborators: [] });

    render(<ProjectPageContent />);
    expect(screen.queryByText('Collaborators')).not.toBeInTheDocument();
  });

  it('section shown for owner even with no collaborators (invite panel visible)', () => {
    setOwnerAuth();
    setProject({ collaborators: [] });

    render(<ProjectPageContent />);
    expect(screen.getByText('Collaborators')).toBeInTheDocument();
    expect(screen.getByTestId('collaborator-invite')).toBeInTheDocument();
  });
});
