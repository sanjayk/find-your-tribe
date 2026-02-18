import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReplace = vi.fn();
let mockPathname = '/settings';
let mockUser: { id: string; username: string } | null = null;
let mockIsLoading = false;

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
    isAuthenticated: !!mockUser,
    accessToken: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { AuthGuard } from './auth-guard';

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockIsLoading = false;
    mockPathname = '/settings';
  });

  it('redirects to /login on protected path when not authenticated', () => {
    render(<AuthGuard><div>Protected</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children on protected path when authenticated', () => {
    mockUser = { id: '1', username: 'maya' };
    render(<AuthGuard><div>Protected</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('renders nothing while auth is loading', () => {
    mockIsLoading = true;
    render(<AuthGuard><div>Protected</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children on public path when not authenticated', () => {
    mockPathname = '/discover';
    render(<AuthGuard><div>Public</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('renders children on profile path when not authenticated', () => {
    mockPathname = '/profile/mayachen';
    render(<AuthGuard><div>Profile</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('protects /onboarding', () => {
    mockPathname = '/onboarding';
    render(<AuthGuard><div>Onboarding</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('protects /feed', () => {
    mockPathname = '/feed';
    render(<AuthGuard><div>Feed</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not protect /login', () => {
    mockPathname = '/login';
    render(<AuthGuard><div>Login</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
