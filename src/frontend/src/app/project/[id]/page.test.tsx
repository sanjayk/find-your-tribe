import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProjectPage from './page';

describe('ProjectPage', () => {
  it('renders page heading', async () => {
    const params = Promise.resolve({ id: '123' });
    render(await ProjectPage({ params }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Project');
  });

  it('renders "Coming soon." text', async () => {
    const params = Promise.resolve({ id: '123' });
    render(await ProjectPage({ params }));
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
