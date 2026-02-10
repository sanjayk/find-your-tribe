import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SignupPage from './page';

describe('SignupPage', () => {
  it('renders page heading', () => {
    render(<SignupPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Signup');
  });

  it('renders "Coming soon." text', () => {
    render(<SignupPage />);
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
