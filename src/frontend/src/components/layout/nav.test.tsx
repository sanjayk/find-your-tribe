import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Default: logged-out state
const mockLogout = vi.fn();
let mockAuthState = {
  user: null as { id: string; username: string; displayName: string; email: string; onboardingCompleted: boolean } | null,
  accessToken: null as string | null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: mockLogout,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuthState,
}));

import Nav from './nav';

describe('Nav', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    });
    // Reset to logged-out state
    mockAuthState = {
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: mockLogout,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Nav />);
  });

  it('renders logo text "find your tribe"', () => {
    render(<Nav />);
    expect(screen.getByText('find your tribe')).toBeInTheDocument();
  });

  describe('logged out', () => {
    it('renders landing page navigation links', () => {
      render(<Nav />);
      expect(screen.getByText('How It Works')).toBeInTheDocument();
      expect(screen.getByText('Builders')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Feed')).toBeInTheDocument();
    });

    it('renders "Sign in" link pointing to /login', () => {
      render(<Nav />);
      const signIn = screen.getByText('Sign in');
      expect(signIn).toBeInTheDocument();
      expect(signIn.closest('a')).toHaveAttribute('href', '/login');
    });

    it('renders "Get started" button pointing to /signup', () => {
      render(<Nav />);
      const getStarted = screen.getByText('Get started');
      expect(getStarted).toBeInTheDocument();
      expect(getStarted.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('opens mobile menu with landing page links', () => {
      render(<Nav />);
      fireEvent.click(screen.getByLabelText('Menu'));
      const mobileLinks = screen.getAllByTestId('mobile-menu-link');
      expect(mobileLinks).toHaveLength(4);
      expect(mobileLinks[0]).toHaveTextContent('How It Works');
    });

    it('shows sign in and get started in mobile menu', () => {
      render(<Nav />);
      fireEvent.click(screen.getByLabelText('Menu'));
      // Mobile footer should have sign in and get started
      const signInLinks = screen.getAllByText('Sign in');
      expect(signInLinks.length).toBeGreaterThanOrEqual(1);
      const getStartedLinks = screen.getAllByText('Get started');
      expect(getStartedLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('logged in', () => {
    beforeEach(() => {
      mockAuthState = {
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
        logout: mockLogout,
      };
    });

    it('renders app navigation links', () => {
      render(<Nav />);
      expect(screen.getByText('Discover')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Feed')).toBeInTheDocument();
    });

    it('does not render "Sign in" or "Get started"', () => {
      render(<Nav />);
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      expect(screen.queryByText('Get started')).not.toBeInTheDocument();
    });

    it('renders user menu button with initial', () => {
      render(<Nav />);
      const menuButton = screen.getByLabelText('User menu');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveTextContent('M');
    });

    it('opens mobile menu with app links', () => {
      render(<Nav />);
      fireEvent.click(screen.getByLabelText('Menu'));
      const mobileLinks = screen.getAllByTestId('mobile-menu-link');
      expect(mobileLinks).toHaveLength(3);
      expect(mobileLinks[0]).toHaveTextContent('Discover');
    });

    it('shows profile and settings links in mobile menu', () => {
      render(<Nav />);
      fireEvent.click(screen.getByLabelText('Menu'));
      expect(screen.getByTestId('mobile-profile-link')).toHaveTextContent('Your Profile');
      expect(screen.getByTestId('mobile-settings-link')).toHaveTextContent('Settings');
    });

    it('shows sign out button in mobile menu', () => {
      render(<Nav />);
      fireEvent.click(screen.getByLabelText('Menu'));
      expect(screen.getByTestId('mobile-sign-out')).toHaveTextContent('Sign out');
    });

    it('calls logout when mobile sign out is clicked', () => {
      render(<Nav />);
      fireEvent.click(screen.getByLabelText('Menu'));
      fireEvent.click(screen.getByTestId('mobile-sign-out'));
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it('renders mobile menu button', () => {
    render(<Nav />);
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
  });

  it('closes mobile menu when close button is clicked', () => {
    render(<Nav />);
    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryAllByTestId('mobile-menu-link')).toHaveLength(0);
  });

  it('adds shadow class when scrolled', () => {
    const { container } = render(<Nav />);
    const nav = container.querySelector('nav');

    expect(nav?.className).not.toContain('shadow-sm');

    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 15,
    });
    fireEvent.scroll(window);

    expect(nav?.className).toContain('shadow-sm');
  });
});
