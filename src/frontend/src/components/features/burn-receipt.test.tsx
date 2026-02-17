import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BurnReceipt } from './burn-receipt';

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

const defaultProps = {
  weeklyData: [10, 20, 35, 25, 40, 30, 50, 45, 60, 55, 70, 65, 80, 52],
  duration: '14 weeks',
  tokens: '485K',
  peakWeek: '52K',
};

describe('BurnReceipt', () => {
  it('renders without crashing', () => {
    render(<BurnReceipt {...defaultProps} />);
  });

  it('renders the "Burn Receipt" label', () => {
    render(<BurnReceipt {...defaultProps} />);
    expect(screen.getByTestId('burn-receipt-label')).toHaveTextContent('Burn Receipt');
  });

  it('renders a canvas element for the sparkline', () => {
    render(<BurnReceipt {...defaultProps} />);
    const canvas = screen.getByTestId('burn-receipt-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('renders Duration stat with correct value', () => {
    render(<BurnReceipt {...defaultProps} />);
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('14 weeks')).toBeInTheDocument();
  });

  it('renders Tokens stat with correct value', () => {
    render(<BurnReceipt {...defaultProps} />);
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('485K')).toBeInTheDocument();
  });

  it('renders Peak week stat with correct value', () => {
    render(<BurnReceipt {...defaultProps} />);
    expect(screen.getByText('Peak week')).toBeInTheDocument();
    expect(screen.getByText('52K')).toBeInTheDocument();
  });

  it('renders all three stat rows', () => {
    render(<BurnReceipt {...defaultProps} />);
    const statsContainer = screen.getByTestId('burn-receipt-stats');
    const statRows = statsContainer.children;
    expect(statRows).toHaveLength(3);
  });

  it('handles empty weeklyData gracefully', () => {
    render(<BurnReceipt {...defaultProps} weeklyData={[]} />);
    expect(screen.getByTestId('burn-receipt')).toBeInTheDocument();
  });

  it('handles single data point gracefully', () => {
    render(<BurnReceipt {...defaultProps} weeklyData={[42]} />);
    expect(screen.getByTestId('burn-receipt')).toBeInTheDocument();
  });
});
