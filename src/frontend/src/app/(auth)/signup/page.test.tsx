import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth
const mockLogin = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: vi.fn(),
  }),
}));

// Mock useMutation
const mockSignupMutation = vi.fn();
vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mockSignupMutation, { loading: false }],
}));

import SignupPage from './page';

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<SignupPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Join the builders',
    );
  });

  it('renders the subline text', () => {
    render(<SignupPage />);
    expect(
      screen.getByText('Show what you ship, find your tribe'),
    ).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<SignupPage />);
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(<SignupPage />);
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('submits the form with all fields', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('Display name'), 'Maya Chen');
    await user.type(screen.getByLabelText('Username'), 'mayachen');
    await user.type(screen.getByLabelText('Email'), 'maya@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(mockSignupMutation).toHaveBeenCalledWith({
      variables: {
        displayName: 'Maya Chen',
        username: 'mayachen',
        email: 'maya@example.com',
        password: 'password123',
      },
    });
  });
});
