import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WitnessCredits } from './witness-credits';
import type { Witness } from './witness-credits';

const mockWitnesses: Witness[] = [
  {
    initials: 'JO',
    name: 'James Okafor',
    role: 'Product Designer',
    projects: [
      { name: 'Tribe Finder', role: 'design' },
      { name: 'Schema Forge', role: 'UI' },
      { name: 'CodeReview Bot', role: 'UX' },
    ],
  },
  {
    initials: 'PS',
    name: 'Priya Sharma',
    role: 'Backend Engineer',
    projects: [
      { name: 'Tribe Finder', role: 'API' },
      { name: 'Latency Dashboard', role: 'pipeline' },
    ],
  },
  {
    initials: 'DM',
    name: 'David Morales',
    role: 'PM \u00b7 Growth',
    projects: [{ name: 'CodeReview Bot', role: 'product' }],
  },
];

describe('WitnessCredits', () => {
  it('renders without crashing', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
  });

  it('renders all witnesses', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    const rows = screen.getAllByTestId('credit-row');
    expect(rows).toHaveLength(3);
  });

  it('renders witness names', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    expect(screen.getByText('James Okafor')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('David Morales')).toBeInTheDocument();
  });

  it('renders witness initials in avatars', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    const avatars = screen.getAllByTestId('credit-avatar');
    expect(avatars[0]).toHaveTextContent('JO');
    expect(avatars[1]).toHaveTextContent('PS');
    expect(avatars[2]).toHaveTextContent('DM');
  });

  it('renders witness roles', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    expect(screen.getByText('Product Designer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders project names and roles', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    const projectsColumns = screen.getAllByTestId('credit-projects');
    // James: Tribe Finder (design), Schema Forge (UI), CodeReview Bot (UX)
    expect(projectsColumns[0].textContent).toContain('Tribe Finder');
    expect(projectsColumns[0].textContent).toContain('(design)');
    expect(projectsColumns[0].textContent).toContain('Schema Forge');
    expect(projectsColumns[0].textContent).toContain('(UI)');
    // Priya: Tribe Finder (API), Latency Dashboard (pipeline)
    expect(projectsColumns[1].textContent).toContain('Tribe Finder');
    expect(projectsColumns[1].textContent).toContain('(API)');
    expect(projectsColumns[1].textContent).toContain('Latency Dashboard');
    expect(projectsColumns[1].textContent).toContain('(pipeline)');
    // David: CodeReview Bot (product)
    expect(projectsColumns[2].textContent).toContain('CodeReview Bot');
    expect(projectsColumns[2].textContent).toContain('(product)');
  });

  it('renders middot separators between projects', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    const middots = screen.getAllByTestId('middot-separator');
    // James has 3 projects -> 2 middots, Priya has 2 -> 1 middot, David has 1 -> 0 middots = 3 total
    expect(middots).toHaveLength(3);
  });

  it('handles single-project witness without middot separator', () => {
    const singleProjectWitness: Witness[] = [
      {
        initials: 'DM',
        name: 'David Morales',
        role: 'PM',
        projects: [{ name: 'CodeReview Bot', role: 'product' }],
      },
    ];
    render(<WitnessCredits witnesses={singleProjectWitness} />);
    expect(screen.queryByTestId('middot-separator')).not.toBeInTheDocument();
  });

  it('renders the "WITNESSED BY" section label', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    expect(screen.getByText(/witnessed by/i)).toBeInTheDocument();
  });

  it('applies accent-line class for the section label', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    const label = screen.getByText(/witnessed by/i);
    expect(label.className).toContain('accent-line');
  });

  it('applies box-shadow separator on non-first rows', () => {
    render(<WitnessCredits witnesses={mockWitnesses} />);
    const rows = screen.getAllByTestId('credit-row');
    // First row should have no box-shadow style
    expect(rows[0].style.boxShadow).toBe('');
    // Second and third rows should have box-shadow for separator
    expect(rows[1].style.boxShadow).toBe('0 -1px 0 var(--color-surface-secondary)');
    expect(rows[2].style.boxShadow).toBe('0 -1px 0 var(--color-surface-secondary)');
  });

  it('returns null for empty witnesses array', () => {
    const { container } = render(<WitnessCredits witnesses={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
