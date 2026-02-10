import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TechBadge } from './tech-badge';

describe('TechBadge', () => {
  describe('pill variant', () => {
    it('renders without crashing', () => {
      render(<TechBadge technologies={['React']} variant="pill" />);
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('renders each technology as a badge with correct styling', () => {
      render(<TechBadge technologies={['React', 'Python', 'TypeScript']} variant="pill" />);

      const reactBadge = screen.getByText('React');
      const pythonBadge = screen.getByText('Python');
      const typescriptBadge = screen.getByText('TypeScript');

      // All badges should be present
      expect(reactBadge).toBeInTheDocument();
      expect(pythonBadge).toBeInTheDocument();
      expect(typescriptBadge).toBeInTheDocument();

      // Check styling classes on badges
      expect(reactBadge).toHaveClass('font-mono', 'text-[11px]', 'bg-surface-secondary', 'text-ink-secondary', 'px-2.5', 'py-1', 'rounded-md');
    });

    it('renders multiple badges with gap spacing', () => {
      const { container } = render(<TechBadge technologies={['React', 'Python']} variant="pill" />);

      // Container should have flex and gap classes
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-wrap', 'gap-1.5');
    });

    it('handles single technology', () => {
      render(<TechBadge technologies={['React']} variant="pill" />);
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('handles empty array', () => {
      const { container } = render(<TechBadge technologies={[]} variant="pill" />);
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe('inline variant', () => {
    it('renders without crashing', () => {
      render(<TechBadge technologies={['React']} variant="inline" />);
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('renders technologies with "/" dividers', () => {
      render(<TechBadge technologies={['React', 'TypeScript', 'PostgreSQL']} variant="inline" />);

      // Check that all technologies are present
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();

      // Check that dividers are present (should be 2 dividers for 3 items)
      const dividers = screen.getAllByText('/');
      expect(dividers).toHaveLength(2);
    });

    it('renders with correct styling', () => {
      render(<TechBadge technologies={['React', 'Python']} variant="inline" />);

      const reactText = screen.getByText('React');
      const pythonText = screen.getByText('Python');

      // Check styling on tech text
      expect(reactText).toHaveClass('font-mono', 'text-[11px]', 'text-ink-tertiary');
      expect(pythonText).toHaveClass('font-mono', 'text-[11px]', 'text-ink-tertiary');

      // Check divider styling
      const divider = screen.getByText('/');
      expect(divider).toHaveClass('text-ink-tertiary/30');
    });

    it('renders with flex wrapper and gap', () => {
      const { container } = render(<TechBadge technologies={['React', 'Python']} variant="inline" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-wrap', 'gap-1.5', 'items-center');
    });

    it('handles single technology without divider', () => {
      render(<TechBadge technologies={['React']} variant="inline" />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });

    it('handles empty array', () => {
      const { container } = render(<TechBadge technologies={[]} variant="inline" />);
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe('variant switching', () => {
    it('switches between pill and inline variants', () => {
      const { rerender } = render(<TechBadge technologies={['React']} variant="pill" />);

      const pillBadge = screen.getByText('React');
      expect(pillBadge).toHaveClass('bg-surface-secondary');

      rerender(<TechBadge technologies={['React']} variant="inline" />);

      const inlineBadge = screen.getByText('React');
      expect(inlineBadge).not.toHaveClass('bg-surface-secondary');
      expect(inlineBadge).toHaveClass('text-ink-tertiary');
    });
  });
});
