import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'mayachen',
      displayName: 'Maya Chen',
      email: 'maya@example.com',
      onboardingCompleted: true,
    },
    accessToken: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock Apollo hooks
const mockUpdateProfile = vi.fn();
let mockQueryData: Record<string, unknown> | null = {
  user: {
    id: '1',
    username: 'mayachen',
    displayName: 'Maya Chen',
    avatarUrl: null,
    headline: 'Full-stack engineer',
    primaryRole: 'ENGINEER',
    timezone: 'America/New_York',
    availabilityStatus: 'OPEN_TO_TRIBE',
    builderScore: 42,
    bio: 'I build things.',
    contactLinks: {},
    githubUsername: 'mayachen',
    agentTools: [],
    agentWorkflowStyle: null,
    humanAgentRatio: null,
    createdAt: '2025-01-01T00:00:00Z',
    skills: [],
    projects: [],
    tribes: [],
  },
};
let mockQueryLoading = false;

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: mockQueryData,
    loading: mockQueryLoading,
    error: null,
  }),
  useMutation: () => [mockUpdateProfile, { loading: false }],
}));

import SettingsPage from './page';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryLoading = false;
    mockQueryData = {
      user: {
        id: '1',
        username: 'mayachen',
        displayName: 'Maya Chen',
        avatarUrl: null,
        headline: 'Full-stack engineer',
        primaryRole: 'ENGINEER',
        timezone: 'America/New_York',
        availabilityStatus: 'OPEN_TO_TRIBE',
        builderScore: 42,
        bio: 'I build things.',
        contactLinks: {},
        githubUsername: 'mayachen',
        agentTools: [],
        agentWorkflowStyle: null,
        humanAgentRatio: null,
        createdAt: '2025-01-01T00:00:00Z',
        skills: [],
        projects: [],
        tribes: [],
      },
    };
  });

  it('renders the page heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
  });

  it('renders the subline text', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Update your profile information')).toBeInTheDocument();
  });

  it('renders sidebar nav with all sections', () => {
    render(<SettingsPage />);
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Links' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeInTheDocument();
  });

  it('defaults to Profile section active', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Profile');
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });

  it('renders Profile section fields', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Headline')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary role')).toBeInTheDocument();
  });

  it('renders a bio textarea', () => {
    render(<SettingsPage />);
    const bio = screen.getByLabelText('Bio');
    expect(bio.tagName).toBe('TEXTAREA');
  });

  it('pre-fills Profile fields from query data', () => {
    render(<SettingsPage />);
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Maya Chen');
    expect((screen.getByLabelText('Headline') as HTMLInputElement).value).toBe('Full-stack engineer');
    expect((screen.getByLabelText('Bio') as HTMLTextAreaElement).value).toBe('I build things.');
    expect((screen.getByLabelText('Primary role') as HTMLSelectElement).value).toBe('ENGINEER');
  });

  it('renders "Save changes" submit button', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('renders back to profile link', () => {
    render(<SettingsPage />);
    const backLink = screen.getByText('Back to profile');
    expect(backLink.closest('a')).toHaveAttribute('href', '/profile/mayachen');
  });

  it('submits the form with all values', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      variables: {
        displayName: 'Maya Chen',
        headline: 'Full-stack engineer',
        bio: 'I build things.',
        primaryRole: 'ENGINEER',
        timezone: 'America/New_York',
        availabilityStatus: 'OPEN_TO_TRIBE',
        contactLinks: {},
      },
    });
  });

  it('allows editing the display name before submitting', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Maya C.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ displayName: 'Maya C.' }),
      }),
    );
  });

  it('shows loading skeleton while query is loading', () => {
    mockQueryLoading = true;
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-skeleton')).toBeInTheDocument();
  });

  it('renders role select options', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('switches to Links section', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Links' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Links');
    expect(screen.getByLabelText('Link 1 label')).toBeInTheDocument();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
  });

  it('switches to Agent section', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Agent' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Agent');
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('switches to Preferences section', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Preferences');
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('can switch back to Profile after navigating away', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Links' }));
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Profile');
  });

  it('includes contactLinks from link rows in profile form submit', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Submit from Profile section — linkRows default URLs are empty
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          contactLinks: {},
        }),
      }),
    );
  });

  describe('Links section', () => {
    it('renders default label rows', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      const labels = ['X', 'LinkedIn', 'Threads', 'GitHub', 'Linear'];
      for (let i = 0; i < labels.length; i++) {
        const labelInput = screen.getByLabelText(`Link ${i + 1} label`) as HTMLInputElement;
        expect(labelInput.value).toBe(labels[i]);
      }
    });

    it('renders default rows with empty URL fields', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      for (let i = 1; i <= 5; i++) {
        const urlInput = screen.getByLabelText(`Link ${i} URL`) as HTMLInputElement;
        expect(urlInput.value).toBe('');
      }
    });

    it('pre-fills URLs from existing contactLinks data', async () => {
      mockQueryData = {
        user: {
          ...mockQueryData!.user as Record<string, unknown>,
          contactLinks: { X: 'https://x.com/maya', LinkedIn: 'https://linkedin.com/in/maya' },
        },
      };
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      expect((screen.getByLabelText('Link 1 URL') as HTMLInputElement).value).toBe('https://x.com/maya');
      expect((screen.getByLabelText('Link 2 URL') as HTMLInputElement).value).toBe('https://linkedin.com/in/maya');
      expect((screen.getByLabelText('Link 3 URL') as HTMLInputElement).value).toBe('');
    });

    it('shows extra non-default entries as additional rows', async () => {
      mockQueryData = {
        user: {
          ...mockQueryData!.user as Record<string, unknown>,
          contactLinks: { X: 'https://x.com/maya', Portfolio: 'https://maya.dev' },
        },
      };
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      // 5 defaults + 1 custom = 6 rows
      expect(screen.getAllByLabelText(/Link \d+ label/)).toHaveLength(6);
      const customLabel = screen.getByLabelText('Link 6 label') as HTMLInputElement;
      expect(customLabel.value).toBe('Portfolio');
      const customUrl = screen.getByLabelText('Link 6 URL') as HTMLInputElement;
      expect(customUrl.value).toBe('https://maya.dev');
    });

    it('adds a new empty row with "Add link" button', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      expect(screen.getAllByLabelText(/Link \d+ label/)).toHaveLength(5);
      await user.click(screen.getByText('Add link'));
      expect(screen.getAllByLabelText(/Link \d+ label/)).toHaveLength(6);
      expect((screen.getByLabelText('Link 6 label') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Link 6 URL') as HTMLInputElement).value).toBe('');
    });

    it('removes a row with the remove button', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      expect(screen.getAllByLabelText(/Link \d+ label/)).toHaveLength(5);
      await user.click(screen.getByLabelText('Remove link 1'));
      expect(screen.getAllByLabelText(/Link \d+ label/)).toHaveLength(4);
      // First row should now be LinkedIn (X was removed)
      expect((screen.getByLabelText('Link 1 label') as HTMLInputElement).value).toBe('LinkedIn');
    });

    it('renders a save button', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });

    it('submits only rows where both label and URL are non-empty', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));

      // Fill in URL for X (first row)
      await user.type(screen.getByLabelText('Link 1 URL'), 'https://x.com/maya');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            contactLinks: { X: 'https://x.com/maya' },
          }),
        }),
      );
    });

    it('submits empty object when all URLs are empty', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Links' }));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            contactLinks: {},
          }),
        }),
      );
    });
  });
});
