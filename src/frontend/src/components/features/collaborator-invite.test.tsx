import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockInviteCollaborator = vi.hoisted(() => vi.fn());
const mockGenerateInviteLink = vi.hoisted(() => vi.fn());
const mockSearchUsers = vi.hoisted(() => vi.fn());
const mockUseMutation = vi.hoisted(() => vi.fn());
const mockUseLazyQuery = vi.hoisted(() => vi.fn());
const mockClipboardWriteText = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

vi.mock('@apollo/client/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...mod,
    useMutation: mockUseMutation,
    useLazyQuery: mockUseLazyQuery,
  };
});

import { CollaboratorInvite } from './collaborator-invite';
import type { Collaborator } from '@/lib/graphql/types';

function makeCollaborator(overrides: Partial<Collaborator> = {}): Collaborator {
  return {
    user: {
      id: 'user-1',
      username: 'alice',
      displayName: 'Alice Builder',
      avatarUrl: null,
      headline: null,
      primaryRole: null,
    },
    role: null,
    status: 'confirmed',
    ...overrides,
  };
}

const searchResults = [
  {
    id: 'user-2',
    username: 'bob',
    displayName: 'Bob Designer',
    avatarUrl: null,
    headline: null,
    primaryRole: null,
  },
  {
    id: 'user-3',
    username: 'carol',
    displayName: 'Carol Engineer',
    avatarUrl: null,
    headline: null,
    primaryRole: null,
  },
];

describe('CollaboratorInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockUseMutation.mockImplementation(
      (mutation: {
        definitions?: Array<{ name?: { value?: string } }>;
      }) => {
        const name = mutation?.definitions?.[0]?.name?.value;
        if (name === 'GenerateInviteLink') {
          return [mockGenerateInviteLink, { loading: false }];
        }
        return [mockInviteCollaborator, { loading: false }];
      }
    );

    mockUseLazyQuery.mockReturnValue([
      mockSearchUsers,
      { data: undefined, loading: false },
    ]);

    mockInviteCollaborator.mockResolvedValue({
      data: {
        projects: {
          inviteCollaborator: {
            user: {
              id: 'user-2',
              username: 'bob',
              displayName: 'Bob Designer',
              avatarUrl: null,
            },
            role: null,
            status: 'pending',
            invitedAt: '2026-02-20T00:00:00Z',
          },
        },
      },
    });

    mockGenerateInviteLink.mockResolvedValue({
      data: {
        projects: {
          generateInviteLink: 'https://findyourtribe.dev/invite/abc123',
        },
      },
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWriteText },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders invite button', () => {
    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
      />
    );

    expect(
      screen.getByRole('button', { name: /invite/i })
    ).toBeInTheDocument();
  });

  it('expands panel on invite button click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));

    expect(
      screen.getByPlaceholderText(/search builders/i)
    ).toBeInTheDocument();
  });

  it('shows search input when panel is expanded', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));

    const input = screen.getByPlaceholderText(/search builders/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('filters out existing collaborators from search results', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const existingCollaborator = makeCollaborator({
      user: {
        id: 'user-2',
        username: 'bob',
        displayName: 'Bob Designer',
        avatarUrl: null,
        headline: null,
        primaryRole: null,
      },
    });

    mockUseLazyQuery.mockReturnValue([
      mockSearchUsers,
      {
        data: {
          searchUsers: [
            ...searchResults,
            {
              id: 'user-4',
              username: 'dave',
              displayName: 'Dave PM',
              avatarUrl: null,
              headline: null,
              primaryRole: null,
            },
          ],
        },
        loading: false,
      },
    ]);

    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[existingCollaborator]}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));
    await user.type(
      screen.getByPlaceholderText(/search builders/i),
      'test'
    );

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      // Carol and Dave should appear; Bob should be filtered out
      expect(screen.getByText('Carol Engineer')).toBeInTheDocument();
      expect(screen.getByText('Dave PM')).toBeInTheDocument();
      expect(screen.queryByText('Bob Designer')).not.toBeInTheDocument();
    });
  });

  it('calls INVITE_COLLABORATOR mutation on selecting a user', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockUseLazyQuery.mockReturnValue([
      mockSearchUsers,
      { data: { searchUsers: searchResults }, loading: false },
    ]);

    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));
    await user.type(
      screen.getByPlaceholderText(/search builders/i),
      'bob'
    );

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Bob Designer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Bob Designer'));

    // Click send invite
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockInviteCollaborator).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            projectId: 'proj-1',
            userId: 'user-2',
          }),
        })
      );
    });
  });

  it('copy invite link button generates URL and copies to clipboard', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));
    await user.click(screen.getByRole('button', { name: /copy invite link/i }));

    await waitFor(() => {
      expect(mockGenerateInviteLink).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ projectId: 'proj-1' }),
        })
      );
    });

    // "Copied!" confirms clipboard.writeText succeeded (setCopied only fires after writeText resolves)
    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });
  });

  it('collapses panel after successful invite', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const mockOnInvited = vi.fn();

    mockUseLazyQuery.mockReturnValue([
      mockSearchUsers,
      { data: { searchUsers: searchResults }, loading: false },
    ]);

    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
        onCollaboratorInvited={mockOnInvited}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));
    await user.type(
      screen.getByPlaceholderText(/search builders/i),
      'bob'
    );

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Bob Designer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Bob Designer'));
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockOnInvited).toHaveBeenCalled();
    });

    // Panel should collapse - search input should no longer be visible
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(/search builders/i)
      ).not.toBeInTheDocument();
    });
  });

  it('supports optional role when inviting', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockUseLazyQuery.mockReturnValue([
      mockSearchUsers,
      { data: { searchUsers: searchResults }, loading: false },
    ]);

    render(
      <CollaboratorInvite
        projectId="proj-1"
        existingCollaborators={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite/i }));
    await user.type(
      screen.getByPlaceholderText(/search builders/i),
      'bob'
    );

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Bob Designer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Bob Designer'));

    // Type a role
    const roleInput = screen.getByPlaceholderText(/role/i);
    await user.type(roleInput, 'Frontend Lead');

    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockInviteCollaborator).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            projectId: 'proj-1',
            userId: 'user-2',
            role: 'Frontend Lead',
          }),
        })
      );
    });
  });
});
