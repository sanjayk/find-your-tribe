import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProfilePage from './page';

describe('ProfilePage', () => {
  it('renders page heading', async () => {
    const params = Promise.resolve({ username: 'testuser' });
    render(await ProfilePage({ params }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Profile');
  });

  it('renders "Coming soon." text', async () => {
    const params = Promise.resolve({ username: 'testuser' });
    render(await ProfilePage({ params }));
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
