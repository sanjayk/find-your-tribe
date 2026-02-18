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
    preferences: {},
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
        preferences: {},
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

  it('renders headline input with maxLength of 60', () => {
    render(<SettingsPage />);
    const headline = screen.getByLabelText('Headline') as HTMLInputElement;
    expect(headline.maxLength).toBe(60);
  });

  it('renders headline character counter', () => {
    render(<SettingsPage />);
    expect(screen.getByText('19 / 60')).toBeInTheDocument();
  });

  it('renders bio textarea with maxLength of 160', () => {
    render(<SettingsPage />);
    const bio = screen.getByLabelText('Bio') as HTMLTextAreaElement;
    expect(bio.maxLength).toBe(160);
  });

  it('renders bio character counter', () => {
    render(<SettingsPage />);
    expect(screen.getByText('15 / 160')).toBeInTheDocument();
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
        agentTools: {},
        agentWorkflowStyle: null,
        humanAgentRatio: 0.5,
        preferences: {
          notifications: {
            tribeInvites: true,
            projectUpdates: true,
            weeklyDigest: false,
          },
          privacy: {
            profileVisibility: 'public',
            showTimezone: true,
            showAgentSetup: true,
          },
        },
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
    expect(screen.getByText('My Setup')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Editors' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
  });

  it('switches to Preferences section', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    expect(screen.getByText('Location & Availability')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
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

  describe('Agent section', () => {
    it('renders My Setup and Workflow subsections', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      expect(screen.getByText('My Setup')).toBeInTheDocument();
      expect(screen.getByText('Workflow')).toBeInTheDocument();
    });

    it('renders all four chip groups with preset chips', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      expect(screen.getByRole('group', { name: 'Editors' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Agents' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Models' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Style' })).toBeInTheDocument();

      // Check some preset chips
      expect(screen.getByRole('button', { name: 'Cursor' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'VS Code' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Claude Code' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Claude Opus' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pair builder' })).toBeInTheDocument();
    });

    it('toggles editor chip selection on/off', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const chip = screen.getByRole('button', { name: 'Cursor' });
      expect(chip).toHaveAttribute('aria-pressed', 'false');
      await user.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'true');
      await user.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles agent chip selection', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const chip = screen.getByRole('button', { name: 'Claude Code' });
      expect(chip).toHaveAttribute('aria-pressed', 'false');
      await user.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'true');
      await user.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles model chip selection', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const chip = screen.getByRole('button', { name: 'Claude Sonnet' });
      expect(chip).toHaveAttribute('aria-pressed', 'false');
      await user.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'true');
    });

    it('toggles workflow style chip selection', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const chip = screen.getByRole('button', { name: 'Pair builder' });
      expect(chip).toHaveAttribute('aria-pressed', 'false');
      await user.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'true');
    });

    it('adds a custom editor via input and auto-selects it', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const input = screen.getByLabelText('Add custom editors');
      await user.type(input, 'Nova');
      await user.click(screen.getAllByText('+ Add')[0]);

      const chip = screen.getByRole('button', { name: 'Nova' });
      expect(chip).toHaveAttribute('aria-pressed', 'true');
    });

    it('adds custom chip via Enter key', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const input = screen.getByLabelText('Add custom editors');
      await user.type(input, 'Nova{Enter}');

      expect(screen.getByRole('button', { name: 'Nova' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('custom chips show remove button and clicking removes them', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const input = screen.getByLabelText('Add custom editors');
      await user.type(input, 'Nova{Enter}');

      expect(screen.getByRole('button', { name: 'Nova' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Remove Nova' }));
      expect(screen.queryByRole('button', { name: 'Nova' })).not.toBeInTheDocument();
    });

    it('rejects empty custom entries', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const editorGroup = screen.getByRole('group', { name: 'Editors' });
      const chipCountBefore = editorGroup.querySelectorAll('button').length;

      const input = screen.getByLabelText('Add custom editors');
      await user.type(input, '   {Enter}');

      expect(editorGroup.querySelectorAll('button').length).toBe(chipCountBefore);
    });

    it('rejects duplicate custom entries', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const input = screen.getByLabelText('Add custom editors');
      await user.type(input, 'Nova{Enter}');

      const editorGroup = screen.getByRole('group', { name: 'Editors' });
      const chipCountAfterFirst = editorGroup.querySelectorAll('button').length;

      await user.type(input, 'Nova{Enter}');
      expect(editorGroup.querySelectorAll('button').length).toBe(chipCountAfterFirst);
    });

    it('rejects custom entries that match a preset', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const editorGroup = screen.getByRole('group', { name: 'Editors' });
      const chipCountBefore = editorGroup.querySelectorAll('button').length;

      const input = screen.getByLabelText('Add custom editors');
      await user.type(input, 'Cursor{Enter}');

      expect(editorGroup.querySelectorAll('button').length).toBe(chipCountBefore);
    });

    it('renders human/AI ratio slider', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const slider = screen.getByLabelText('Human / AI ratio') as HTMLInputElement;
      expect(slider.type).toBe('range');
      expect(slider.value).toBe('50');
      expect(screen.getByText('50 / 50')).toBeInTheDocument();
    });

    it('renders setup note textarea with placeholder and maxLength', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      const textarea = screen.getByLabelText('Setup note') as HTMLTextAreaElement;
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea.placeholder).toBe('Describe how you work with AI...');
      expect(textarea.maxLength).toBe(300);
    });

    it('renders character count below setup note', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      expect(screen.getByText('0 / 300')).toBeInTheDocument();
    });

    it('pre-fills selections and custom chips from saved agentTools data', async () => {
      mockQueryData = {
        user: {
          ...mockQueryData!.user as Record<string, unknown>,
          agentTools: {
            editors: ['Cursor', 'Nova'],
            agents: ['Claude Code', 'Cline'],
            models: ['Claude Sonnet'],
            workflowStyles: ['Pair builder', 'My custom flow'],
            setupNote: 'I pair with Claude all day',
          },
          humanAgentRatio: 0.4,
        },
      };
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      // Editors
      expect(screen.getByRole('button', { name: 'Cursor' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Nova' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'VS Code' })).toHaveAttribute('aria-pressed', 'false');

      // Agents
      expect(screen.getByRole('button', { name: 'Claude Code' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Cline' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Copilot' })).toHaveAttribute('aria-pressed', 'false');

      // Models
      expect(screen.getByRole('button', { name: 'Claude Sonnet' })).toHaveAttribute('aria-pressed', 'true');

      // Workflows
      expect(screen.getByRole('button', { name: 'Pair builder' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'My custom flow' })).toHaveAttribute('aria-pressed', 'true');

      // Setup note
      expect((screen.getByLabelText('Setup note') as HTMLTextAreaElement).value).toBe('I pair with Claude all day');

      // Ratio
      expect((screen.getByLabelText('Human / AI ratio') as HTMLInputElement).value).toBe('40');
    });

    it('backward compat: migrates old agentWorkflowStyle enum into chip selections', async () => {
      mockQueryData = {
        user: {
          ...mockQueryData!.user as Record<string, unknown>,
          agentTools: {},
          agentWorkflowStyle: 'PAIR',
        },
      };
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      expect(screen.getByRole('button', { name: 'Pair builder' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('submits structured agentTools with editors/agents/models/workflowStyles/setupNote', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      // Select editors
      await user.click(screen.getByRole('button', { name: 'Windsurf' }));
      // Select agents
      await user.click(screen.getByRole('button', { name: 'Claude Code' }));
      await user.click(screen.getByRole('button', { name: 'Aider' }));
      // Select a model
      await user.click(screen.getByRole('button', { name: 'Claude Opus' }));
      // Set workflow
      await user.click(screen.getByRole('button', { name: 'Swarm delegation' }));
      // Type setup note
      await user.type(screen.getByLabelText('Setup note'), 'My setup note');

      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            agentTools: {
              editors: ['Windsurf'],
              agents: ['Claude Code', 'Aider'],
              models: ['Claude Opus'],
              workflowStyles: ['Swarm delegation'],
              setupNote: 'My setup note',
            },
            agentWorkflowStyle: null,
            humanAgentRatio: 0.5,
          }),
        }),
      );
    });

    it('submits empty agentTools when nothing selected', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            agentTools: {},
          }),
        }),
      );
    });

    it('always sends agentWorkflowStyle: null', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            agentWorkflowStyle: null,
          }),
        }),
      );
    });

    it('renders a save button', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Agent' }));

      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });
  });

  describe('Preferences section', () => {
    it('renders timezone and availability selects', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
      expect(screen.getByLabelText('Availability')).toBeInTheDocument();
    });

    it('pre-fills timezone and availability from data', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      expect((screen.getByLabelText('Timezone') as HTMLSelectElement).value).toBe('America/New_York');
      expect((screen.getByLabelText('Availability') as HTMLSelectElement).value).toBe('OPEN_TO_TRIBE');
    });

    it('renders notification toggle switches with defaults', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      const tribeInvites = screen.getByRole('switch', { name: 'Tribe invites' });
      const projectUpdates = screen.getByRole('switch', { name: 'Project updates' });
      const weeklyDigest = screen.getByRole('switch', { name: 'Weekly digest' });

      expect(tribeInvites).toHaveAttribute('aria-checked', 'true');
      expect(projectUpdates).toHaveAttribute('aria-checked', 'true');
      expect(weeklyDigest).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles flip on click', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      const weeklyDigest = screen.getByRole('switch', { name: 'Weekly digest' });
      expect(weeklyDigest).toHaveAttribute('aria-checked', 'false');
      await user.click(weeklyDigest);
      expect(weeklyDigest).toHaveAttribute('aria-checked', 'true');
      await user.click(weeklyDigest);
      expect(weeklyDigest).toHaveAttribute('aria-checked', 'false');
    });

    it('renders privacy select and toggles', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      expect(screen.getByLabelText('Profile visibility')).toBeInTheDocument();
      expect((screen.getByLabelText('Profile visibility') as HTMLSelectElement).value).toBe('public');
      expect(screen.getByRole('switch', { name: 'Show timezone' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('switch', { name: 'Show agent setup' })).toHaveAttribute('aria-checked', 'true');
    });

    it('pre-fills from saved preferences data', async () => {
      mockQueryData = {
        user: {
          ...mockQueryData!.user as Record<string, unknown>,
          preferences: {
            notifications: { tribeInvites: false, projectUpdates: true, weeklyDigest: true },
            privacy: { profileVisibility: 'tribe_only', showTimezone: false, showAgentSetup: false },
          },
        },
      };
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      expect(screen.getByRole('switch', { name: 'Tribe invites' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('switch', { name: 'Project updates' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('switch', { name: 'Weekly digest' })).toHaveAttribute('aria-checked', 'true');
      expect((screen.getByLabelText('Profile visibility') as HTMLSelectElement).value).toBe('tribe_only');
      expect(screen.getByRole('switch', { name: 'Show timezone' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('switch', { name: 'Show agent setup' })).toHaveAttribute('aria-checked', 'false');
    });

    it('submits preferences, timezone, and availability in mutation', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      // Toggle weekly digest on
      await user.click(screen.getByRole('switch', { name: 'Weekly digest' }));

      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            timezone: 'America/New_York',
            availabilityStatus: 'OPEN_TO_TRIBE',
            preferences: {
              notifications: {
                tribeInvites: true,
                projectUpdates: true,
                weeklyDigest: true,
              },
              privacy: {
                profileVisibility: 'public',
                showTimezone: true,
                showAgentSetup: true,
              },
            },
          }),
        }),
      );
    });

    it('renders a save button', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole('button', { name: 'Preferences' }));

      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });
  });
});
