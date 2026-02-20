import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAddMilestone = vi.hoisted(() => vi.fn());
const mockDeleteMilestone = vi.hoisted(() => vi.fn());
const mockUseMutation = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...mod,
    useMutation: mockUseMutation,
  };
});

import { BuildTimeline } from './build-timeline';
import type { ProjectMilestone } from '@/lib/graphql/types';

function makeMilestone(overrides: Partial<ProjectMilestone> = {}): ProjectMilestone {
  return {
    id: 'm1',
    title: 'First Commit',
    date: '2025-01-15',
    milestoneType: 'milestone',
    createdAt: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('BuildTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockImplementation((mutation: { definitions?: Array<{ name?: { value?: string } }> }) => {
      const name = mutation?.definitions?.[0]?.name?.value;
      if (name === 'AddMilestone') {
        return [mockAddMilestone, { loading: false }];
      }
      return [mockDeleteMilestone, { loading: false }];
    });
    mockAddMilestone.mockResolvedValue({
      data: {
        projects: {
          addMilestone: {
            id: 'new-m1',
            title: 'New Milestone',
            date: '2025-06-01',
            milestoneType: 'milestone',
            createdAt: '2025-06-01T00:00:00Z',
          },
        },
      },
    });
    mockDeleteMilestone.mockResolvedValue({
      data: { projects: { deleteMilestone: true } },
    });
  });

  it('renders without crashing in owner mode with no milestones', () => {
    render(<BuildTimeline milestones={[]} editable={true} />);
    expect(screen.getByText(/no milestones yet/i)).toBeInTheDocument();
  });

  it('returns null in visitor mode with no milestones', () => {
    const { container } = render(<BuildTimeline milestones={[]} editable={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders milestones in chronological order (earliest date first)', () => {
    const milestones = [
      makeMilestone({ id: 'm2', title: 'Launch Day', date: '2025-03-01' }),
      makeMilestone({ id: 'm1', title: 'First Commit', date: '2025-01-15' }),
    ];
    const { container } = render(<BuildTimeline milestones={milestones} />);
    const items = container.querySelectorAll('[data-testid="milestone-item"]');
    expect(items[0]).toHaveTextContent('First Commit');
    expect(items[1]).toHaveTextContent('Launch Day');
  });

  it('shows add milestone button only when editable=true', () => {
    render(<BuildTimeline milestones={[makeMilestone()]} editable={true} />);
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
  });

  it('does not show add milestone button when editable=false', () => {
    render(<BuildTimeline milestones={[makeMilestone()]} editable={false} />);
    expect(screen.queryByRole('button', { name: /add milestone/i })).not.toBeInTheDocument();
  });

  it('shows delete button only when editable=true', () => {
    render(<BuildTimeline milestones={[makeMilestone()]} editable={true} />);
    expect(screen.getByRole('button', { name: /delete milestone/i })).toBeInTheDocument();
  });

  it('does not show delete button when editable=false', () => {
    render(<BuildTimeline milestones={[makeMilestone()]} editable={false} />);
    expect(screen.queryByRole('button', { name: /delete milestone/i })).not.toBeInTheDocument();
  });

  it('renders type-specific icon labels for all milestone types', () => {
    const milestones = [
      makeMilestone({ id: 'm1', title: 'Start', milestoneType: 'start', date: '2025-01-01' }),
      makeMilestone({ id: 'm2', title: 'Checkpoint', milestoneType: 'milestone', date: '2025-02-01' }),
      makeMilestone({ id: 'm3', title: 'Deploy', milestoneType: 'deploy', date: '2025-03-01' }),
      makeMilestone({ id: 'm4', title: 'Launch', milestoneType: 'launch', date: '2025-04-01' }),
    ];
    render(<BuildTimeline milestones={milestones} />);
    expect(screen.getByLabelText('start milestone')).toBeInTheDocument();
    expect(screen.getByLabelText('milestone milestone')).toBeInTheDocument();
    expect(screen.getByLabelText('deploy milestone')).toBeInTheDocument();
    expect(screen.getByLabelText('launch milestone')).toBeInTheDocument();
  });

  it('shows owner-mode prompt with add button when milestones list is empty', () => {
    render(<BuildTimeline milestones={[]} editable={true} />);
    expect(screen.getByText(/no milestones yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add first milestone/i })).toBeInTheDocument();
  });

  it('opens inline form when add milestone button is clicked', async () => {
    const user = userEvent.setup();
    render(<BuildTimeline milestones={[makeMilestone()]} editable={true} projectId="p1" />);

    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  it('calls ADD_MILESTONE mutation with projectId on form submit', async () => {
    const user = userEvent.setup();
    render(<BuildTimeline milestones={[]} editable={true} projectId="p1" />);

    await user.click(screen.getByRole('button', { name: /add first milestone/i }));

    await user.type(screen.getByLabelText(/title/i), 'Initial commit');
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2025-06-01' } });

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockAddMilestone).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ projectId: 'p1' }),
        })
      );
    });
  });

  it('calls DELETE_MILESTONE mutation with milestoneId on delete confirmation', async () => {
    const user = userEvent.setup();
    const milestone = makeMilestone({ id: 'del-m1', title: 'To Delete' });
    render(<BuildTimeline milestones={[milestone]} editable={true} projectId="p1" />);

    await user.click(screen.getByRole('button', { name: /delete milestone/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockDeleteMilestone).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ milestoneId: 'del-m1' }),
        })
      );
    });
  });

  it('formats milestone dates in consistent locale', () => {
    const milestone = makeMilestone({ date: '2025-06-15' });
    render(<BuildTimeline milestones={[milestone]} />);
    expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument();
  });

  it('renders milestone title in the DOM', () => {
    const milestone = makeMilestone({ title: 'v1.0 Shipped' });
    render(<BuildTimeline milestones={[milestone]} />);
    expect(screen.getByText('v1.0 Shipped')).toBeInTheDocument();
  });
});
