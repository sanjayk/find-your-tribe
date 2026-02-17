import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileFooter } from './profile-footer';
import type { TribeItem, LinkItem, InfoItem } from './profile-footer';

const mockTribes: TribeItem[] = [
  { name: 'Buildspace Alumni', memberCount: 12 },
  { name: 'Infra Nerds', memberCount: 8 },
];

const mockLinks: LinkItem[] = [
  { label: 'GitHub', value: '@mayachen', href: 'https://github.com/mayachen' },
  { label: 'Twitter', value: '@maya_ships', href: 'https://twitter.com/maya_ships' },
  { label: 'Website', value: 'mayachen.dev', href: 'https://mayachen.dev' },
];

const mockInfo: InfoItem[] = [
  { label: 'Timezone', value: 'PST \u00b7 UTC-8' },
  { label: 'Primary role', value: 'Full-Stack Engineer' },
  { label: 'Joined', value: 'March 2025' },
];

describe('ProfileFooter', () => {
  it('renders without crashing', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
  });

  it('renders three column headers', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    expect(screen.getByTestId('tribes-header')).toHaveTextContent('Tribes');
    expect(screen.getByTestId('links-header')).toHaveTextContent('Links');
    expect(screen.getByTestId('info-header')).toHaveTextContent('Info');
  });

  it('renders tribe names', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    expect(screen.getByText('Buildspace Alumni')).toBeInTheDocument();
    expect(screen.getByText('Infra Nerds')).toBeInTheDocument();
  });

  it('renders tribe member counts', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    expect(screen.getByText('12 builders')).toBeInTheDocument();
    expect(screen.getByText('8 builders')).toBeInTheDocument();
  });

  it('renders singular "builder" for count of 1', () => {
    const singleMemberTribe: TribeItem[] = [{ name: 'Solo Tribe', memberCount: 1 }];
    render(<ProfileFooter tribes={singleMemberTribe} links={mockLinks} info={mockInfo} />);
    expect(screen.getByText('1 builder')).toBeInTheDocument();
  });

  it('renders link labels', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
  });

  it('renders link values as anchor tags', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    const linkValues = screen.getAllByTestId('link-value');
    expect(linkValues).toHaveLength(3);

    expect(linkValues[0]).toHaveTextContent('@mayachen');
    expect(linkValues[0].tagName).toBe('A');
    expect(linkValues[0]).toHaveAttribute('href', 'https://github.com/mayachen');

    expect(linkValues[1]).toHaveTextContent('@maya_ships');
    expect(linkValues[1]).toHaveAttribute('href', 'https://twitter.com/maya_ships');

    expect(linkValues[2]).toHaveTextContent('mayachen.dev');
    expect(linkValues[2]).toHaveAttribute('href', 'https://mayachen.dev');
  });

  it('renders info labels and values', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText('PST \u00b7 UTC-8')).toBeInTheDocument();
    expect(screen.getByText('Primary role')).toBeInTheDocument();
    expect(screen.getByText('Full-Stack Engineer')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('March 2025')).toBeInTheDocument();
  });

  it('renders info values without link styling', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    const infoValues = screen.getAllByTestId('info-value');
    infoValues.forEach((el) => {
      expect(el.querySelector('a')).toBeNull();
    });
  });

  it('renders with 3-column grid layout', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    const footer = screen.getByTestId('profile-footer');
    expect(footer.className).toContain('grid-cols-3');
  });

  it('renders border-top for the footer separator', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={mockInfo} />);
    const footer = screen.getByTestId('profile-footer');
    expect(footer.className).toContain('border-t');
    expect(footer.className).toContain('border-surface-secondary');
  });

  it('handles empty tribes array', () => {
    render(<ProfileFooter tribes={[]} links={mockLinks} info={mockInfo} />);
    expect(screen.queryByTestId('tribe-item')).not.toBeInTheDocument();
  });

  it('handles empty links array', () => {
    render(<ProfileFooter tribes={mockTribes} links={[]} info={mockInfo} />);
    expect(screen.queryByTestId('link-item')).not.toBeInTheDocument();
  });

  it('handles empty info array', () => {
    render(<ProfileFooter tribes={mockTribes} links={mockLinks} info={[]} />);
    expect(screen.queryByTestId('info-item')).not.toBeInTheDocument();
  });
});
