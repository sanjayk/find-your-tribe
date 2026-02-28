import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletenessSection } from './completeness-section';

describe('CompletenessSection', () => {
  it('renders without crashing', () => {
    render(<CompletenessSection completeness={0.5} missingFields={['bio']} />);
  });

  it('displays "Profile Completeness" title when incomplete', () => {
    render(<CompletenessSection completeness={0.5} missingFields={['bio']} />);
    expect(screen.getByText('Profile Completeness')).toBeInTheDocument();
  });

  it('displays "Profile Complete" title when completeness=1.0', () => {
    render(<CompletenessSection completeness={1.0} missingFields={[]} />);
    expect(screen.getByText('Profile Complete')).toBeInTheDocument();
  });

  it('renders correct number of missing field items', () => {
    render(
      <CompletenessSection completeness={0.5} missingFields={['bio', 'timezone', 'avatar']} />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('each missing field shows correct human-readable label', () => {
    render(
      <CompletenessSection completeness={0.5} missingFields={['bio', 'timezone', 'avatar']} />,
    );
    expect(screen.getByText('Add a bio')).toBeInTheDocument();
    expect(screen.getByText('Set your timezone')).toBeInTheDocument();
    expect(screen.getByText('Add an avatar')).toBeInTheDocument();
  });

  it('missing field items are clickable (button role)', () => {
    render(<CompletenessSection completeness={0.5} missingFields={['bio']} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('hides missing fields list when completeness=1.0', () => {
    render(<CompletenessSection completeness={1.0} missingFields={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('displays "N fields remaining" with correct count', () => {
    render(
      <CompletenessSection completeness={0.5} missingFields={['bio', 'timezone']} />,
    );
    expect(screen.getByText('2 fields remaining')).toBeInTheDocument();
  });

  it('at completeness=0, shows encouraging subtitle', () => {
    render(<CompletenessSection completeness={0} missingFields={['bio', 'avatar']} />);
    expect(
      screen.getByText(
        'Complete your profile so other builders can find and evaluate you.',
      ),
    ).toBeInTheDocument();
  });

  it('passes completeness percentage to CompletenessRing correctly', () => {
    render(<CompletenessSection completeness={0.75} missingFields={['bio']} />);
    const ring = screen.getByRole('progressbar');
    expect(ring).toHaveAttribute('aria-valuenow', '75');
  });

  describe('click handler', () => {
    beforeEach(() => {
      const mockElement = {
        scrollIntoView: vi.fn(),
        focus: vi.fn(),
      } as unknown as HTMLElement;
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    });

    it('calls scrollIntoView with smooth behavior on missing field click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CompletenessSection completeness={0.5} missingFields={['bio']} />);
      await user.click(screen.getByRole('button'));
      const el = document.getElementById('field-bio');
      expect(el!.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
    });
  });
});
