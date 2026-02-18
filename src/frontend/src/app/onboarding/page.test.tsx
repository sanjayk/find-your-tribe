import { render, screen } from '@testing-library/react';
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
      onboardingCompleted: false,
    },
    accessToken: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock useMutation
const mockCompleteOnboarding = vi.fn();
vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mockCompleteOnboarding, { loading: false }],
}));

import OnboardingPage from './page';

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<OnboardingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Set up your profile',
    );
  });

  it('renders the subline text', () => {
    render(<OnboardingPage />);
    expect(
      screen.getByText('Tell the community what you build'),
    ).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<OnboardingPage />);
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Headline')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary role')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    expect(screen.getByLabelText('Availability')).toBeInTheDocument();
  });

  it('renders timezone as a select with grouped options', () => {
    render(<OnboardingPage />);
    const timezoneSelect = screen.getByLabelText('Timezone') as HTMLSelectElement;
    expect(timezoneSelect.tagName).toBe('SELECT');
    // Should have the placeholder option and optgroups with timezone options
    expect(screen.getByText('Select a timezone')).toBeInTheDocument();
    // At minimum, America and Europe groups should exist
    const optgroups = timezoneSelect.querySelectorAll('optgroup');
    expect(optgroups.length).toBeGreaterThan(0);
  });

  it('auto-detects and pre-selects user timezone', () => {
    render(<OnboardingPage />);
    const timezoneSelect = screen.getByLabelText('Timezone') as HTMLSelectElement;
    // Should be pre-filled with detected timezone (not empty placeholder)
    expect(timezoneSelect.value).not.toBe('');
  });

  it('renders a submit button', () => {
    render(<OnboardingPage />);
    expect(
      screen.getByRole('button', { name: 'Complete setup' }),
    ).toBeInTheDocument();
  });

  it('pre-fills display name from auth user', () => {
    render(<OnboardingPage />);
    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    expect(input.value).toBe('Maya Chen');
  });

  it('renders role select options', () => {
    render(<OnboardingPage />);
    const select = screen.getByLabelText('Primary role') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('renders availability select options', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Open to tribe')).toBeInTheDocument();
    expect(screen.getByText('Available for projects')).toBeInTheDocument();
    expect(screen.getByText('Just browsing')).toBeInTheDocument();
  });

  it('submits the form', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.click(screen.getByRole('button', { name: 'Complete setup' }));

    expect(mockCompleteOnboarding).toHaveBeenCalled();
  });
});
