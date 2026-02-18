import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BurnMapDotGrid, generateMockBurnData } from './burn-map';

describe('BurnMapDotGrid', () => {
  const emptyData = new Array(52 * 7).fill(0);

  it('renders without crashing', () => {
    render(<BurnMapDotGrid data={emptyData} />);
  });

  it('renders 364 dots for full-year view (52 weeks x 7 days)', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} />);
    // Each dot is a div inside the grid; the grid has 364 children
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid!.children).toHaveLength(364);
  });

  it('renders 182 dots in compact mode (26 weeks x 7 days)', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} compact />);
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid!.children).toHaveLength(182);
  });

  it('renders month labels', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} />);
    const monthLabels = container.querySelectorAll('.font-mono.text-ink-tertiary');
    // 12 month labels in full view
    expect(monthLabels.length).toBe(12);
  });

  it('renders 6 month labels in compact mode', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} compact />);
    const monthLabels = container.querySelectorAll('.font-mono.text-ink-tertiary');
    expect(monthLabels.length).toBe(6);
  });

  it('uses 52 columns in full mode', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} />);
    const grid = container.querySelector('.grid') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(52, 1fr)');
  });

  it('uses 26 columns in compact mode', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} compact />);
    const grid = container.querySelector('.grid') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(26, 1fr)');
  });

  it('applies color based on intensity value', () => {
    // Create data with a known intensity at a specific position
    const data = new Array(52 * 7).fill(0);
    data[0] = 1; // Maximum intensity for week 0, day 0
    const { container } = render(<BurnMapDotGrid data={data} />);
    const grid = container.querySelector('.grid');
    // First dot in grid is day 0, week 0 (transposed: row-major)
    const firstDot = grid!.children[0] as HTMLElement;
    // Intensity 1 maps to ACCENT_COLORS[6] = '#4f46e5' (jsdom converts to rgb)
    expect(firstDot.style.backgroundColor).toBe('rgb(79, 70, 229)');
  });

  it('applies empty color for zero intensity', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} />);
    const grid = container.querySelector('.grid');
    const firstDot = grid!.children[0] as HTMLElement;
    // Intensity 0 maps to ACCENT_COLORS[0] = '#f2f0ed' (jsdom converts to rgb)
    expect(firstDot.style.backgroundColor).toBe('rgb(242, 240, 237)');
  });

  it('renders dots as circles (borderRadius 50%)', () => {
    const { container } = render(<BurnMapDotGrid data={emptyData} />);
    const grid = container.querySelector('.grid');
    const firstDot = grid!.children[0] as HTMLElement;
    expect(firstDot.style.borderRadius).toBe('50%');
  });

  it('handles data shorter than expected gracefully', () => {
    const shortData = new Array(10).fill(0.5);
    const { container } = render(<BurnMapDotGrid data={shortData} />);
    const grid = container.querySelector('.grid');
    // Should still render 364 dots, with missing data defaulting to 0
    expect(grid!.children).toHaveLength(364);
  });
});

describe('generateMockBurnData', () => {
  it('generates exactly 364 data points', () => {
    const data = generateMockBurnData('heavy');
    expect(data).toHaveLength(364);
  });

  it('generates values between 0 and 1', () => {
    const data = generateMockBurnData('moderate');
    data.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it('generates different patterns', () => {
    const heavy = generateMockBurnData('heavy');
    const dormant = generateMockBurnData('dormant');
    // Heavy pattern should have more total activity than dormant
    const heavySum = heavy.reduce((a, b) => a + b, 0);
    const dormantSum = dormant.reduce((a, b) => a + b, 0);
    expect(heavySum).toBeGreaterThan(dormantSum);
  });

  it('sporadic pattern has many zero values', () => {
    const data = generateMockBurnData('sporadic');
    const zeros = data.filter((v) => v === 0).length;
    // Sporadic should have at least some zeros
    expect(zeros).toBeGreaterThan(0);
  });

  it('new pattern has activity concentrated in later weeks', () => {
    const data = generateMockBurnData('new');
    // First 40 weeks (280 days) should have zero activity
    const earlyActivity = data.slice(0, 280).reduce((a, b) => a + b, 0);
    const lateActivity = data.slice(280).reduce((a, b) => a + b, 0);
    expect(earlyActivity).toBe(0);
    expect(lateActivity).toBeGreaterThan(0);
  });
});
