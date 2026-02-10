import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renders page heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Login');
  });

  it('renders "Coming soon." text', () => {
    render(<LoginPage />);
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
