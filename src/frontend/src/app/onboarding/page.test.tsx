import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import OnboardingPage from './page';

describe('OnboardingPage', () => {
  it('renders page heading', () => {
    render(<OnboardingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Onboarding');
  });

  it('renders "Coming soon." text', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
