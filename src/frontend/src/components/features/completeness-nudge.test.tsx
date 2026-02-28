import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletenessNudge } from './completeness-nudge';

describe('CompletenessNudge', () => {
  it('renders without crashing when completeness < 1.0', () => {
    render(<CompletenessNudge completeness={0.5} />);
  });

  it('returns null (not rendered) when completeness = 1.0', () => {
    const { container } = render(<CompletenessNudge completeness={1.0} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct percentage at completeness=0.67 (shows "67% complete")', () => {
    render(<CompletenessNudge completeness={0.67} />);
    expect(screen.getByText(/67% complete/)).toBeInTheDocument();
  });

  it('renders "0% complete" at completeness=0', () => {
    render(<CompletenessNudge completeness={0} />);
    expect(screen.getByText(/0% complete/)).toBeInTheDocument();
  });

  it('contains a link to /settings', () => {
    render(<CompletenessNudge completeness={0.5} />);
    const link = screen.getByRole('link', { name: 'Finish profile →' });
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('link text is "Finish profile →"', () => {
    render(<CompletenessNudge completeness={0.5} />);
    expect(screen.getByText('Finish profile →')).toBeInTheDocument();
  });

  it('renders CompletenessRing with sm size (16px)', () => {
    render(<CompletenessNudge completeness={0.5} />);
    const ring = screen.getByRole('progressbar');
    expect(ring).toBeInTheDocument();
    expect(ring).toHaveStyle({ width: '16px', height: '16px' });
  });
});
