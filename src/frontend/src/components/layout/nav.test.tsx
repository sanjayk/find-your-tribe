import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Nav from './nav';

describe('Nav', () => {
  beforeEach(() => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Nav />);
  });

  it('renders logo text "find your tribe"', () => {
    render(<Nav />);
    expect(screen.getByText('find your tribe')).toBeInTheDocument();
  });

  it('renders desktop navigation links', () => {
    render(<Nav />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Builders')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Feed')).toBeInTheDocument();
  });

  it('renders "Join the waitlist" button', () => {
    render(<Nav />);
    const buttons = screen.getAllByText('Join the waitlist');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders mobile menu button', () => {
    render(<Nav />);
    const menuButton = screen.getByLabelText('Menu');
    expect(menuButton).toBeInTheDocument();
  });

  it('renders "Sign in" link', () => {
    render(<Nav />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('opens mobile menu when hamburger is clicked', () => {
    render(<Nav />);
    const menuButton = screen.getByLabelText('Menu');

    // Menu should be closed initially
    const mobileMenuLinks = screen.queryAllByTestId('mobile-menu-link');
    expect(mobileMenuLinks.length).toBe(0);

    // Click to open
    fireEvent.click(menuButton);

    // Now mobile menu should be visible
    const visibleMobileLinks = screen.getAllByTestId('mobile-menu-link');
    expect(visibleMobileLinks.length).toBeGreaterThan(0);
  });

  it('closes mobile menu when close button is clicked', () => {
    render(<Nav />);

    // Open menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);

    // Close menu
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    // Menu should be closed
    const mobileMenuLinks = screen.queryAllByTestId('mobile-menu-link');
    expect(mobileMenuLinks.length).toBe(0);
  });

  it('adds shadow class when scrolled', () => {
    const { container } = render(<Nav />);
    const nav = container.querySelector('nav');

    // Initially no shadow
    expect(nav?.className).not.toContain('shadow-sm');

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 15,
    });
    fireEvent.scroll(window);

    // Should have shadow
    expect(nav?.className).toContain('shadow-sm');
  });
});
