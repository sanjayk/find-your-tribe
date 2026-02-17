import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProofCard } from './proof-card';

// Mock canvas getContext for jsdom
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    set fillStyle(_v: string | CanvasGradient) {},
    set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {},
  } as unknown as CanvasRenderingContext2D);
});

const heroProps = {
  variant: 'hero' as const,
  title: 'Tribe Finder',
  description: 'AI-powered matching engine that connects builders based on complementary skills.',
  status: 'in_progress' as const,
  agentTools: ['Claude Code', 'Cursor'],
  builders: [
    { initials: 'MC', name: 'Maya Chen' },
    { initials: 'JO', name: 'James Okafor' },
    { initials: 'PS', name: 'Priya Sharma' },
  ],
  tribeLabel: 'via Buildspace Alumni',
  receipt: {
    weeklyData: [10, 20, 35, 25, 40, 30, 50, 45, 60, 55, 70, 65, 80, 52],
    duration: '14 weeks',
    tokens: '485K',
    peakWeek: '52K',
  },
};

const compactProps = {
  variant: 'compact' as const,
  title: 'CodeReview Bot',
  description: 'Automated PR reviewer using LLM analysis. Used by 12 teams internally.',
  status: 'shipped' as const,
  sparklineData: [15, 25, 30, 45, 35, 50, 40, 55, 60, 45, 70, 65, 55],
  burnStat: '420K \u00b7 13 wks',
  tribeLabel: 'via Buildspace Alumni',
};

describe('ProofCard', () => {
  describe('hero variant', () => {
    it('renders without crashing', () => {
      render(<ProofCard {...heroProps} />);
    });

    it('renders the title', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByTestId('proof-title')).toHaveTextContent('Tribe Finder');
    });

    it('renders the description', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByTestId('proof-description')).toHaveTextContent(
        'AI-powered matching engine that connects builders based on complementary skills.'
      );
    });

    it('renders the correct status for in_progress', () => {
      render(<ProofCard {...heroProps} />);
      const status = screen.getByTestId('proof-status');
      expect(status).toHaveTextContent('Currently building');
    });

    it('renders the correct status for shipped', () => {
      render(<ProofCard {...heroProps} status="shipped" />);
      const status = screen.getByTestId('proof-status');
      expect(status).toHaveTextContent('Shipped');
    });

    it('renders agent tools', () => {
      render(<ProofCard {...heroProps} />);
      const toolsContainer = screen.getByTestId('proof-agent-tools');
      expect(toolsContainer).toBeInTheDocument();
      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
    });

    it('renders builder avatars with initials', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByText('MC')).toBeInTheDocument();
      expect(screen.getByText('JO')).toBeInTheDocument();
      expect(screen.getByText('PS')).toBeInTheDocument();
    });

    it('renders builder count', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByTestId('proof-builder-count')).toHaveTextContent('3 builders');
    });

    it('renders tribe label', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByTestId('proof-tribe-label')).toHaveTextContent('via Buildspace Alumni');
    });

    it('renders the burn receipt panel', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByTestId('burn-receipt')).toBeInTheDocument();
      expect(screen.getByText('Burn Receipt')).toBeInTheDocument();
      expect(screen.getByText('14 weeks')).toBeInTheDocument();
      expect(screen.getByText('485K')).toBeInTheDocument();
      expect(screen.getByText('52K')).toBeInTheDocument();
    });

    it('renders the hero wrapper element', () => {
      render(<ProofCard {...heroProps} />);
      expect(screen.getByTestId('proof-card-hero')).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders without crashing', () => {
      render(<ProofCard {...compactProps} />);
    });

    it('renders the title', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.getByTestId('proof-title')).toHaveTextContent('CodeReview Bot');
    });

    it('renders the description', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.getByTestId('proof-description')).toHaveTextContent(
        'Automated PR reviewer using LLM analysis. Used by 12 teams internally.'
      );
    });

    it('renders the correct shipped status', () => {
      render(<ProofCard {...compactProps} />);
      const status = screen.getByTestId('proof-status');
      expect(status).toHaveTextContent('Shipped');
    });

    it('renders the sparkline canvas', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.getByTestId('compact-sparkline-canvas')).toBeInTheDocument();
    });

    it('renders burn stat text', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.getByTestId('compact-burn-stat')).toHaveTextContent('420K \u00b7 13 wks');
    });

    it('renders tribe label', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.getByTestId('proof-tribe-label')).toHaveTextContent('via Buildspace Alumni');
    });

    it('does NOT render agent tools', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.queryByTestId('proof-agent-tools')).not.toBeInTheDocument();
    });

    it('renders the compact wrapper element', () => {
      render(<ProofCard {...compactProps} />);
      expect(screen.getByTestId('proof-card-compact')).toBeInTheDocument();
    });
  });

  describe('missing optional props', () => {
    it('renders hero without agentTools', () => {
      const { agentTools: _at, ...propsWithoutTools } = heroProps;
      render(<ProofCard {...propsWithoutTools} />);
      expect(screen.queryByTestId('proof-agent-tools')).not.toBeInTheDocument();
      expect(screen.getByTestId('proof-title')).toHaveTextContent('Tribe Finder');
    });

    it('renders hero without builders', () => {
      const { builders: _b, ...propsWithoutBuilders } = heroProps;
      render(<ProofCard {...propsWithoutBuilders} />);
      expect(screen.queryByTestId('proof-builders')).not.toBeInTheDocument();
      expect(screen.getByTestId('proof-title')).toHaveTextContent('Tribe Finder');
    });

    it('renders hero without tribeLabel', () => {
      const { tribeLabel: _tl, ...propsWithoutTribe } = heroProps;
      render(<ProofCard {...propsWithoutTribe} />);
      expect(screen.queryByTestId('proof-tribe-label')).not.toBeInTheDocument();
    });

    it('renders hero without receipt', () => {
      const { receipt: _r, ...propsWithoutReceipt } = heroProps;
      render(<ProofCard {...propsWithoutReceipt} />);
      expect(screen.queryByTestId('burn-receipt')).not.toBeInTheDocument();
    });

    it('renders compact without sparklineData', () => {
      const { sparklineData: _sd, ...propsWithoutSparkline } = compactProps;
      render(<ProofCard {...propsWithoutSparkline} />);
      expect(screen.queryByTestId('compact-sparkline')).not.toBeInTheDocument();
      expect(screen.getByTestId('proof-title')).toHaveTextContent('CodeReview Bot');
    });

    it('renders compact without burnStat', () => {
      const { burnStat: _bs, ...propsWithoutBurn } = compactProps;
      render(<ProofCard {...propsWithoutBurn} />);
      expect(screen.queryByTestId('compact-burn-stat')).not.toBeInTheDocument();
    });

    it('renders compact without tribeLabel', () => {
      const { tribeLabel: _tl, ...propsWithoutTribe } = compactProps;
      render(<ProofCard {...propsWithoutTribe} />);
      expect(screen.queryByTestId('proof-tribe-label')).not.toBeInTheDocument();
    });

    it('renders hero with empty agentTools array', () => {
      render(<ProofCard {...heroProps} agentTools={[]} />);
      expect(screen.queryByTestId('proof-agent-tools')).not.toBeInTheDocument();
    });

    it('renders hero with empty builders array', () => {
      render(<ProofCard {...heroProps} builders={[]} />);
      expect(screen.queryByTestId('proof-builders')).not.toBeInTheDocument();
    });

    it('renders hero with single builder using singular label', () => {
      render(
        <ProofCard
          {...heroProps}
          builders={[{ initials: 'MC', name: 'Maya Chen' }]}
        />
      );
      expect(screen.getByTestId('proof-builder-count')).toHaveTextContent('1 builder');
    });
  });
});
