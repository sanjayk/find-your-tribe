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

  it('renders all form fields', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Headline')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary role')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    expect(screen.getByLabelText('Availability')).toBeInTheDocument();
  });

  it('renders a bio textarea (not present in onboarding)', () => {
    render(<SettingsPage />);
    const bio = screen.getByLabelText('Bio');
    expect(bio.tagName).toBe('TEXTAREA');
  });

  it('pre-fills fields from profile data', () => {
    render(<SettingsPage />);
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Maya Chen');
    expect((screen.getByLabelText('Headline') as HTMLInputElement).value).toBe('Full-stack engineer');
    expect((screen.getByLabelText('Bio') as HTMLTextAreaElement).value).toBe('I build things.');
    expect((screen.getByLabelText('Primary role') as HTMLSelectElement).value).toBe('ENGINEER');
    expect((screen.getByLabelText('Timezone') as HTMLSelectElement).value).toBe('America/New_York');
    expect((screen.getByLabelText('Availability') as HTMLSelectElement).value).toBe('OPEN_TO_TRIBE');
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

  it('submits the form with updated values', async () => {
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

  it('renders availability select options', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Open to tribe')).toBeInTheDocument();
    expect(screen.getByText('Available for projects')).toBeInTheDocument();
    expect(screen.getByText('Just browsing')).toBeInTheDocument();
  });
});
