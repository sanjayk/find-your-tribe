import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TribePage from './page';

describe('TribePage', () => {
  it('renders page heading', async () => {
    const params = Promise.resolve({ id: '123' });
    render(await TribePage({ params }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tribe');
  });

  it('renders "Coming soon." text', async () => {
    const params = Promise.resolve({ id: '123' });
    render(await TribePage({ params }));
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
