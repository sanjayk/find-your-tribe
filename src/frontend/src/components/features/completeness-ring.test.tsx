import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletenessRing } from './completeness-ring';

// Mirror the constants from the implementation so tests stay in sync.
const LG_RADIUS = 30;
const LG_CIRCUMFERENCE = 2 * Math.PI * LG_RADIUS;

describe('CompletenessRing', () => {
  describe('accessibility', () => {
    it('renders without crashing', () => {
      render(<CompletenessRing percentage={50} size="lg" />);
    });

    it('has role=progressbar', () => {
      render(<CompletenessRing percentage={50} size="lg" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('sets aria-valuenow to the percentage prop', () => {
      render(<CompletenessRing percentage={67} size="lg" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    });

    it('sets aria-valuemin=0 and aria-valuemax=100', () => {
      render(<CompletenessRing percentage={50} size="lg" />);
      const ring = screen.getByRole('progressbar');
      expect(ring).toHaveAttribute('aria-valuemin', '0');
      expect(ring).toHaveAttribute('aria-valuemax', '100');
    });

    it('has aria-label "Profile completeness" when incomplete', () => {
      render(<CompletenessRing percentage={75} size="lg" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Profile completeness',
      );
    });

    it('has aria-label "Profile complete" at 100%', () => {
      render(<CompletenessRing percentage={100} size="lg" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Profile complete',
      );
    });
  });

  describe('lg size — progress arc', () => {
    it('shows full dashoffset at 0% (no progress)', () => {
      const { container } = render(<CompletenessRing percentage={0} size="lg" />);
      const arc = container.querySelector('[data-testid="progress-arc"]');
      const dashoffset = parseFloat(arc!.getAttribute('stroke-dashoffset')!);
      expect(dashoffset).toBeCloseTo(LG_CIRCUMFERENCE, 1);
    });

    it('shows half dashoffset at 50%', () => {
      const { container } = render(<CompletenessRing percentage={50} size="lg" />);
      const arc = container.querySelector('[data-testid="progress-arc"]');
      const dashoffset = parseFloat(arc!.getAttribute('stroke-dashoffset')!);
      expect(dashoffset).toBeCloseTo(LG_CIRCUMFERENCE * 0.5, 1);
    });

    it('shows zero dashoffset at 100%', () => {
      const { container } = render(<CompletenessRing percentage={100} size="lg" />);
      const arc = container.querySelector('[data-testid="progress-arc"]');
      const dashoffset = parseFloat(arc!.getAttribute('stroke-dashoffset')!);
      expect(dashoffset).toBeCloseTo(0, 1);
    });

    it('progress arc has CSS transition on stroke-dashoffset', () => {
      const { container } = render(<CompletenessRing percentage={50} size="lg" />);
      const arc = container.querySelector('[data-testid="progress-arc"]') as HTMLElement;
      expect(arc!.style.transition).toContain('stroke-dashoffset');
      expect(arc!.style.transition).toContain('400ms');
    });

    it('uses accent color when below 100%', () => {
      const { container } = render(<CompletenessRing percentage={67} size="lg" />);
      const arc = container.querySelector('[data-testid="progress-arc"]');
      expect(arc!.getAttribute('stroke')).toBe('var(--color-accent)');
    });

    it('uses shipped color at 100%', () => {
      const { container } = render(<CompletenessRing percentage={100} size="lg" />);
      const arc = container.querySelector('[data-testid="progress-arc"]');
      expect(arc!.getAttribute('stroke')).toBe('var(--color-shipped)');
    });

    it('track circle uses surface-secondary color', () => {
      const { container } = render(<CompletenessRing percentage={50} size="lg" />);
      const track = container.querySelector('[data-testid="track-circle"]');
      expect(track!.getAttribute('stroke')).toBe('var(--color-surface-secondary)');
    });
  });

  describe('lg size — center text', () => {
    it('renders percentage text in lg size', () => {
      render(<CompletenessRing percentage={67} size="lg" />);
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('renders 0% text at 0%', () => {
      render(<CompletenessRing percentage={0} size="lg" />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('renders 50% text at 50%', () => {
      render(<CompletenessRing percentage={50} size="lg" />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('percentage text uses font-mono class', () => {
      render(<CompletenessRing percentage={50} size="lg" />);
      const text = screen.getByText('50%');
      expect(text).toHaveClass('font-mono');
    });

    it('percentage text uses text-accent class', () => {
      render(<CompletenessRing percentage={50} size="lg" />);
      const text = screen.getByText('50%');
      expect(text).toHaveClass('text-accent');
    });

    it('replaces percentage text with checkmark at 100%', () => {
      render(<CompletenessRing percentage={100} size="lg" />);
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });

    it('renders a checkmark icon at 100%', () => {
      const { container } = render(<CompletenessRing percentage={100} size="lg" />);
      // Lucide Check renders an SVG with a specific path — just check an svg is present inside
      const svgs = container.querySelectorAll('svg');
      // There's the ring SVG plus the icon SVG
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sm size', () => {
    it('renders without crashing', () => {
      render(<CompletenessRing percentage={50} size="sm" />);
    });

    it('has role=progressbar', () => {
      render(<CompletenessRing percentage={50} size="sm" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not render percentage text', () => {
      render(<CompletenessRing percentage={50} size="sm" />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('does not render percentage text even at 0%', () => {
      render(<CompletenessRing percentage={0} size="sm" />);
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });

    it('does not render checkmark at 100%', () => {
      const { container } = render(<CompletenessRing percentage={100} size="sm" />);
      // sm size should only have the ring SVG, no icon SVG
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(1);
    });
  });
});
