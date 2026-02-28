import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './footer';

describe('Footer', () => {
  it('renders without crashing', () => {
    render(<Footer />);
  });

  it('renders logo text "find your tribe"', () => {
    render(<Footer />);
    expect(screen.getByText('find your tribe.')).toBeInTheDocument();
  });

  it('renders tagline "Clout through building, not posting."', () => {
    render(<Footer />);
    expect(screen.getByText('Clout through building, not posting.')).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    render(<Footer />);
    expect(screen.getByText(/© \d{4} Find Your Tribe/)).toBeInTheDocument();
  });

  it('has correct responsive layout classes', () => {
    const { container } = render(<Footer />);
    const innerDiv = container.querySelector('.flex');

    // Check for responsive flex classes
    expect(innerDiv?.className).toContain('flex-col');
    expect(innerDiv?.className).toContain('md:flex-row');
    expect(innerDiv?.className).toContain('md:items-center');
  });

  it('renders logo with serif font', () => {
    render(<Footer />);
    const logo = screen.getByText('find your tribe.');
    expect(logo.className).toContain('font-serif');
  });

  it('has max-width container with correct padding', () => {
    const { container } = render(<Footer />);
    const maxWidthDiv = container.querySelector('.max-w-\\[1120px\\]');

    expect(maxWidthDiv).toBeInTheDocument();
    expect(maxWidthDiv?.className).toContain('mx-auto');
    expect(maxWidthDiv?.className).toContain('px-5');
    expect(maxWidthDiv?.className).toContain('md:px-6');
  });
});
