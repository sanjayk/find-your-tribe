import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUpdateProject = vi.hoisted(() => vi.fn());
const mockDeleteProject = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...mod,
    useMutation: vi.fn((mutation) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opName = (mutation as any).definitions?.[0]?.name?.value;
      if (opName === 'DeleteProject') {
        return [
          mockDeleteProject,
          { loading: false, error: undefined, called: false, reset: vi.fn() },
        ];
      }
      return [
        mockUpdateProject,
        { loading: false, error: undefined, called: false, reset: vi.fn() },
      ];
    }),
  };
});

import { EditProjectDialog } from './edit-project-dialog';
import type { Project, ProjectStatus } from '@/lib/graphql/types';

const mockProject: Project = {
  id: 'project-1',
  title: 'Nomad Finance',
  description: 'Banking for the nomadic generation.',
  status: 'IN_PROGRESS' as ProjectStatus,
  role: 'Lead Engineer',
  links: { demo: 'https://demo.example.com' },
  techStack: ['Next.js', 'Stripe'],
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
    id: 'user-1',
    username: 'nomaddev',
    displayName: 'Nomad Dev',
    avatarUrl: null,
    headline: null,
    primaryRole: null,
  },
};

describe('EditProjectDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnUpdated = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProject.mockResolvedValue({
      data: { projects: { updateProject: { ...mockProject } } },
    });
    mockDeleteProject.mockResolvedValue({
      data: { projects: { deleteProject: true } },
    });
  });

  it('renders pre-filled form fields matching project prop', () => {
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByDisplayValue('Nomad Finance')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Banking for the nomadic generation.'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lead Engineer')).toBeInTheDocument();
  });

  it('title input has required attribute', () => {
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByLabelText(/title \*/i)).toBeRequired();
  });

  it('calls UPDATE_PROJECT mutation on save', async () => {
    const user = userEvent.setup();
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ id: 'project-1' }),
        }),
      );
    });
  });

  it('calls onUpdated callback after successful save', async () => {
    const user = userEvent.setup();
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled();
    });
  });

  it('shows delete confirmation when delete button clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete project/i }));

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm delete/i }),
    ).toBeInTheDocument();
  });

  it('calls DELETE_PROJECT mutation on confirmed delete', async () => {
    const user = userEvent.setup();
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onDeleted={mockOnDeleted}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete project/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { id: 'project-1' },
        }),
      );
    });
  });

  it('redirects to owner profile after successful delete', async () => {
    const user = userEvent.setup();
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete project/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/profile/nomaddev');
    });
  });

  it('shows error message when update mutation fails', async () => {
    const user = userEvent.setup();
    mockUpdateProject.mockRejectedValue(new Error('Failed to update'));
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to update')).toBeInTheDocument();
    });
  });

  it('danger zone section renders with delete button', () => {
    render(
      <EditProjectDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete project/i }),
    ).toBeInTheDocument();
  });
});
