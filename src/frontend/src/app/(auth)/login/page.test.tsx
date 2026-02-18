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
const mockLoginMutation = vi.fn();
vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mockLoginMutation, { loading: false }],
}));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Welcome back',
    );
  });

  it('renders the subline text', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign in to continue building')).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders link to signup page', () => {
    render(<LoginPage />);
    const link = screen.getByRole('link', { name: 'Create an account' });
    expect(link).toHaveAttribute('href', '/signup');
  });

  it('submits the form with email and password', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockLoginMutation).toHaveBeenCalledWith({
      variables: { email: 'test@example.com', password: 'password123' },
    });
  });
});
