import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BuilderCard from './builder-card';

describe('BuilderCard', () => {
  const mockBuilder = {
    name: 'Maya Chen',
    initials: 'MC',
    title: 'Full-Stack Developer',
    bio: 'Building AI-powered tools for makers. Previously led engineering at a YC startup. Believes the best products are built by small, opinionated teams.',
    skills: ['React', 'Python', 'PostgreSQL', 'FastAPI'],
    score: 72,
    status: 'open' as const,
    avatarColor: 'bg-indigo-100',
    avatarTextColor: 'text-indigo-700',
  };

  describe('featured variant', () => {
    it('renders without crashing', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" />);
    });

    it('renders name, title, and bio', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" />);
      expect(screen.getByText('Maya Chen')).toBeInTheDocument();
      expect(screen.getByText('Full-Stack Developer')).toBeInTheDocument();
      expect(screen.getByText(/Building AI-powered tools for makers/)).toBeInTheDocument();
    });

    it('renders skills as tech badge pills', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('FastAPI')).toBeInTheDocument();

      // Check that skills are rendered as badges (pill style)
      const reactBadge = screen.getByText('React');
      expect(reactBadge.className).toContain('font-mono');
    });

    it('renders score display', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" />);
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('score')).toBeInTheDocument();
    });

    it('renders status badge for "open" status', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" status="open" />);
      expect(screen.getByText('Open to collaborate')).toBeInTheDocument();
    });

    it('renders status badge for "collaborating" status', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" status="collaborating" />);
      expect(screen.getByText('Collaborating')).toBeInTheDocument();
    });

    it('renders status badge for "heads-down" status', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" status="heads-down" />);
      expect(screen.getByText('Heads down')).toBeInTheDocument();
    });

    it('renders avatar with initials', () => {
      render(<BuilderCard {...mockBuilder} variant="featured" />);
      expect(screen.getByText('MC')).toBeInTheDocument();
    });
  });

  describe('list variant', () => {
    it('renders without crashing', () => {
      render(<BuilderCard {...mockBuilder} variant="list" />);
    });

    it('renders name and title', () => {
      render(<BuilderCard {...mockBuilder} variant="list" />);
      expect(screen.getByText('Maya Chen')).toBeInTheDocument();
      expect(screen.getByText('Full-Stack Developer')).toBeInTheDocument();
    });

    it('renders score', () => {
      render(<BuilderCard {...mockBuilder} variant="list" />);
      expect(screen.getByText('72')).toBeInTheDocument();
    });

    it('renders skills as inline text with slash separators', () => {
      render(<BuilderCard {...mockBuilder} variant="list" />);

      // Check skills are rendered
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('FastAPI')).toBeInTheDocument();

      // Check for slash separators
      const container = screen.getByText('React').parentElement;
      expect(container?.textContent).toContain('/');
    });

    it('renders status badge', () => {
      render(<BuilderCard {...mockBuilder} variant="list" status="open" />);
      expect(screen.getByText('Open to collaborate')).toBeInTheDocument();
    });

    it('renders avatar with initials', () => {
      render(<BuilderCard {...mockBuilder} variant="list" />);
      expect(screen.getByText('MC')).toBeInTheDocument();
    });

    it('does not render bio in list variant', () => {
      render(<BuilderCard {...mockBuilder} variant="list" />);
      expect(screen.queryByText(/Building AI-powered tools for makers/)).not.toBeInTheDocument();
    });
  });
});
