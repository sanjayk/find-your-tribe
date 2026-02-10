import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreDisplay } from './score-display';

describe('ScoreDisplay', () => {
  describe('large variant', () => {
    it('renders score number prominently', () => {
      render(<ScoreDisplay score={72} variant="large" />);
      const scoreElement = screen.getByText('72');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement).toHaveClass('text-[48px]');
      expect(scoreElement).toHaveClass('font-mono');
      expect(scoreElement).toHaveClass('text-accent');
    });

    it('renders builder score label below', () => {
      render(<ScoreDisplay score={72} variant="large" />);
      const labelElement = screen.getByText(/builder.*score/i);
      expect(labelElement).toBeInTheDocument();
      expect(labelElement).toHaveClass('text-ink-tertiary');
    });

    it('displays correct score value', () => {
      render(<ScoreDisplay score={85} variant="large" />);
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });

  describe('inline variant', () => {
    it('renders score number', () => {
      render(<ScoreDisplay score={58} variant="inline" />);
      const scoreElement = screen.getByText('58');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement).toHaveClass('text-[32px]');
      expect(scoreElement).toHaveClass('font-mono');
      expect(scoreElement).toHaveClass('text-accent');
    });

    it('renders score label inline', () => {
      render(<ScoreDisplay score={58} variant="inline" />);
      const labelElement = screen.getByText('score');
      expect(labelElement).toBeInTheDocument();
      expect(labelElement).toHaveClass('text-ink-tertiary');
    });

    it('displays score and label side-by-side', () => {
      const { container } = render(<ScoreDisplay score={58} variant="inline" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-baseline');
    });
  });

  describe('small variant', () => {
    it('renders compact score display', () => {
      render(<ScoreDisplay score={41} variant="small" />);
      const scoreElement = screen.getByText('41');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement).toHaveClass('text-[22px]');
      expect(scoreElement).toHaveClass('font-mono');
    });

    it('uses correct color for score', () => {
      render(<ScoreDisplay score={41} variant="small" />);
      const scoreElement = screen.getByText('41');
      // Small variant uses accent/80 or ink-tertiary based on prototype
      expect(scoreElement).toHaveClass('text-accent');
    });
  });

  describe('score variations', () => {
    it('handles zero score', () => {
      render(<ScoreDisplay score={0} variant="large" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles three-digit scores', () => {
      render(<ScoreDisplay score={100} variant="inline" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});
