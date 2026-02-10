import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DiscoverPage from './page';

describe('DiscoverPage', () => {
  it('renders page heading', () => {
    render(<DiscoverPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Discover');
  });

  it('renders "Coming soon." text', () => {
    render(<DiscoverPage />);
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
