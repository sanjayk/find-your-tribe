import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BurnHeatmap } from './burn-heatmap';

const mockStats = {
  daysActive: 218,
  totalTokens: '1.2M',
  activeWeeks: '46 / 52',
  shipped: '4 / 5',
};

function makeDailyActivity(count: number) {
  const days = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      tokens: Math.floor(Math.random() * 5000),
    });
  }
  return days;
}

describe('BurnHeatmap', () => {
  it('renders without crashing', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
  });

  it('renders exactly 364 cells (52 weeks × 7 days)', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    expect(cells).toHaveLength(364);
  });

  it('applies intensity level classes based on token data', () => {
    // Day with 0 tokens = level-0 = bg-surface-secondary
    // We can verify that cells with no activity get level 0
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    // All cells should be level 0 when no activity provided
    cells.forEach((cell) => {
      expect(cell.dataset.level).toBe('0');
    });
  });

  it('assigns correct intensity level for active days', () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const activity = [{ date: todayStr, tokens: 10000 }];
    render(<BurnHeatmap dailyActivity={activity} stats={mockStats} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    const todayCell = cells.find((c) => c.dataset.date === todayStr);
    expect(todayCell).toBeDefined();
    // With only one day active, it's the max — should be level 4
    expect(todayCell!.dataset.level).toBe('4');
  });

  it('renders 12 month labels', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    const monthLabels = screen.getAllByTestId('month-label');
    expect(monthLabels).toHaveLength(12);
  });

  it('renders the legend with "Less" and "More" labels', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('renders all 4 stats', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    expect(screen.getByText('218')).toBeInTheDocument();
    expect(screen.getByText('1.2M')).toBeInTheDocument();
    expect(screen.getByText('46 / 52')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
  });

  it('renders stat labels', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    expect(screen.getByText(/Days active/i)).toBeInTheDocument();
    expect(screen.getByText(/Tokens burned/i)).toBeInTheDocument();
    expect(screen.getByText(/Active weeks/i)).toBeInTheDocument();
    expect(screen.getByText(/Shipped/i)).toBeInTheDocument();
  });

  it('renders cells as circles (rounded-full)', () => {
    render(<BurnHeatmap dailyActivity={[]} stats={mockStats} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    cells.forEach((cell) => {
      expect(cell.className).toContain('rounded-full');
    });
  });

  it('handles a full year of activity data gracefully', () => {
    const activity = makeDailyActivity(365);
    render(<BurnHeatmap dailyActivity={activity} stats={mockStats} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    expect(cells).toHaveLength(364);
  });
});
