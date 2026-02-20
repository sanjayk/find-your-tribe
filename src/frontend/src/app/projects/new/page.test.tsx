import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockSearchParamsGet = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockCreateProject = vi.fn();
let capturedOnCompleted: ((data: unknown) => void) | null = null;
let capturedOnError: ((err: { message?: string }) => void) | null = null;

vi.mock('@apollo/client/react', () => ({
  useMutation: (
    _doc: unknown,
    opts?: {
      onCompleted?: (data: unknown) => void;
      onError?: (err: { message?: string }) => void;
    },
  ) => {
    if (opts?.onCompleted) capturedOnCompleted = opts.onCompleted;
    if (opts?.onError) capturedOnError = opts.onError;
    return [mockCreateProject, { loading: false }];
  },
}));

// ── Import ──────────────────────────────────────────────────────────────────

import NewProjectPage from './page';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('NewProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnCompleted = null;
    capturedOnError = null;
    mockSearchParamsGet = vi.fn().mockReturnValue(null);
  });

  it('renders without crashing', () => {
    render(<NewProjectPage />);
  });

  it('renders the "New Project" heading', () => {
    render(<NewProjectPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New Project');
  });

  it('renders title, status, description, and role fields', () => {
    render(<NewProjectPage />);
    expect(screen.getByLabelText(/^Title/)).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Your role')).toBeInTheDocument();
  });

  it('renders preset link URL inputs', () => {
    render(<NewProjectPage />);
    expect(screen.getByLabelText('website URL')).toBeInTheDocument();
    expect(screen.getByLabelText('github URL')).toBeInTheDocument();
    expect(screen.getByLabelText('demo URL')).toBeInTheDocument();
    expect(screen.getByLabelText('docs URL')).toBeInTheDocument();
  });

  it('status defaults to IN_PROGRESS', () => {
    render(<NewProjectPage />);
    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('IN_PROGRESS');
  });

  it('shows the helper text about non-code project types', () => {
    render(<NewProjectPage />);
    expect(screen.getByText(/code, design, strategy, operations/i)).toBeInTheDocument();
  });

  it('renders the "Create Project" submit button', () => {
    render(<NewProjectPage />);
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
  });

  it('shows a validation error when title is empty on submit', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);
    await user.click(screen.getByRole('button', { name: 'Create Project' }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('does not call mutation when title is empty', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);
    await user.click(screen.getByRole('button', { name: 'Create Project' }));
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('submits with correct mutation variables', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'My Awesome Project');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(mockCreateProject).toHaveBeenCalledWith({
      variables: {
        input: {
          title: 'My Awesome Project',
          status: 'IN_PROGRESS',
          description: null,
          role: null,
          links: {},
        },
      },
    });
  });

  it('includes non-empty link URLs in mutation variables', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'My Project');
    await user.type(screen.getByLabelText('website URL'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(mockCreateProject).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({
          links: { website: 'https://example.com' },
        }),
      },
    });
  });

  it('includes description and role in mutation when provided', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'My Project');
    await user.type(screen.getByLabelText('Description'), 'A great project');
    await user.type(screen.getByLabelText('Your role'), 'Lead Engineer');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(mockCreateProject).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({
          description: 'A great project',
          role: 'Lead Engineer',
        }),
      },
    });
  });

  it('redirects to /project/[id] on successful creation', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'Test Project');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    capturedOnCompleted!({ projects: { createProject: { id: 'proj-42' } } });

    expect(mockPush).toHaveBeenCalledWith('/project/proj-42');
  });

  it('redirects to /onboarding when ?from=onboarding', async () => {
    mockSearchParamsGet = vi.fn().mockImplementation((key: string) =>
      key === 'from' ? 'onboarding' : null,
    );

    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'Onboarding Project');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    capturedOnCompleted!({ projects: { createProject: { id: 'proj-99' } } });

    expect(mockPush).toHaveBeenCalledWith('/onboarding');
  });

  it('adds a custom link row when clicking "+ Add link"', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    // 4 preset URL inputs initially
    expect(screen.getAllByPlaceholderText('https://')).toHaveLength(4);
    await user.click(screen.getByText('+ Add link'));
    expect(screen.getAllByPlaceholderText('https://')).toHaveLength(5);
  });

  it('removes a custom link row', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.click(screen.getByText('+ Add link'));
    expect(screen.getAllByPlaceholderText('https://')).toHaveLength(5);

    await user.click(screen.getByLabelText('Remove link 5'));
    expect(screen.getAllByPlaceholderText('https://')).toHaveLength(4);
  });

  it('includes custom link in mutation when key and URL are provided', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'Custom Link Project');
    await user.click(screen.getByText('+ Add link'));

    await user.type(screen.getByLabelText('Link 5 key'), 'portfolio');
    await user.type(screen.getByLabelText('Link 5 URL'), 'https://portfolio.dev');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(mockCreateProject).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({
          links: { portfolio: 'https://portfolio.dev' },
        }),
      },
    });
  });

  it('shows an error message when mutation fails', async () => {
    const user = userEvent.setup();
    render(<NewProjectPage />);

    await user.type(screen.getByLabelText(/^Title/), 'Failing Project');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    capturedOnError!({ message: 'Something went wrong on the server' });

    expect(await screen.findByText('Something went wrong on the server')).toBeInTheDocument();
  });
});
