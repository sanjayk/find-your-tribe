import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockImportProject = vi.hoisted(() => vi.fn());
const mockFetchMore = vi.hoisted(() => vi.fn());
const mockUseMutation = vi.hoisted(() => vi.fn());
const mockUseQuery = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...mod,
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
  };
});

import { GithubImport } from './github-import';

function makeRepo(overrides: Partial<{
  fullName: string;
  description: string;
  languages: string[];
  stars: number;
  url: string;
}> = {}) {
  return {
    fullName: 'acme/my-project',
    description: 'A cool project',
    languages: ['TypeScript', 'Go'],
    stars: 42,
    url: 'https://github.com/acme/my-project',
    ...overrides,
  };
}

function setupConnected(repos = [makeRepo()]) {
  mockUseQuery.mockImplementation((doc: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const opName = doc?.definitions?.[0]?.name?.value;
    if (opName === 'GetBuilder') {
      return {
        data: { user: { githubUsername: 'testuser' } },
        loading: false,
        error: null,
        fetchMore: mockFetchMore,
      };
    }
    return {
      data: { myGithubRepos: repos },
      loading: false,
      error: null,
      fetchMore: mockFetchMore,
    };
  });
}

describe('GithubImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        onboardingCompleted: true,
      },
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseMutation.mockReturnValue([mockImportProject, { loading: false }]);
    mockImportProject.mockResolvedValue({
      data: {
        projects: {
          importFromGithub: { id: 'proj-1', title: 'My Project' },
        },
      },
    });
    // Default: GitHub not connected
    mockUseQuery.mockReturnValue({
      data: { user: { githubUsername: null } },
      loading: false,
      error: null,
      fetchMore: mockFetchMore,
    });
  });

  it('renders connect GitHub prompt when user has no githubUsername', () => {
    render(<GithubImport />);
    expect(screen.getByText(/connect github/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to settings/i })).toBeInTheDocument();
  });

  it('renders repo list when GitHub is connected', () => {
    setupConnected();
    render(<GithubImport />);
    expect(screen.getByText('acme/my-project')).toBeInTheDocument();
    expect(screen.getByText('A cool project')).toBeInTheDocument();
  });

  it('shows language pills and star count for each repo', () => {
    setupConnected();
    render(<GithubImport />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('★ 42')).toBeInTheDocument();
  });

  it('shows import preview when a repo row is clicked', async () => {
    const user = userEvent.setup();
    setupConnected();
    render(<GithubImport />);
    await user.click(screen.getByTestId('repo-row'));
    expect(screen.getByText(/import preview/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import project/i })).toBeInTheDocument();
  });

  it('pre-populates preview with repo data (name, description, languages, stars)', async () => {
    const user = userEvent.setup();
    setupConnected([makeRepo({ fullName: 'my-org/shiplog', description: 'Changelog SaaS', languages: ['Rust'], stars: 99 })]);
    render(<GithubImport />);
    await user.click(screen.getByTestId('repo-row'));
    expect(screen.getByText('my-org/shiplog')).toBeInTheDocument();
    expect(screen.getByText('Changelog SaaS')).toBeInTheDocument();
    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getByText('★ 99')).toBeInTheDocument();
  });

  it('calls import mutation with repoFullName and role, then redirects', async () => {
    const user = userEvent.setup();
    const onProjectImported = vi.fn();
    setupConnected();
    render(<GithubImport onProjectImported={onProjectImported} />);

    await user.click(screen.getByTestId('repo-row'));
    await user.type(screen.getByLabelText(/your role/i), 'Lead Engineer');
    await user.click(screen.getByRole('button', { name: /import project/i }));

    await waitFor(() => {
      expect(mockImportProject).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            repoFullName: 'acme/my-project',
            role: 'Lead Engineer',
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/project/proj-1');
      expect(onProjectImported).toHaveBeenCalledWith('proj-1');
    });
  });

  it('shows Load more button when a full page of repos is returned', () => {
    const PER_PAGE = 20;
    const fullPage = Array.from({ length: PER_PAGE }, (_, i) =>
      makeRepo({ fullName: `acme/repo-${i}` }),
    );
    setupConnected(fullPage);
    render(<GithubImport />);
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('does not show Load more when fewer repos than page size are returned', () => {
    setupConnected([makeRepo()]);
    render(<GithubImport />);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('navigates back to repo list when Cancel is clicked in preview', async () => {
    const user = userEvent.setup();
    setupConnected();
    render(<GithubImport />);
    await user.click(screen.getByTestId('repo-row'));
    expect(screen.getByText(/import preview/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/import preview/i)).not.toBeInTheDocument();
    expect(screen.getByText('acme/my-project')).toBeInTheDocument();
  });
});
