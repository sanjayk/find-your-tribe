import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FeedPage from './page';

describe('FeedPage', () => {
  it('renders page heading', () => {
    render(<FeedPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Feed');
  });

  it('renders "Coming soon." text', () => {
    render(<FeedPage />);
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
