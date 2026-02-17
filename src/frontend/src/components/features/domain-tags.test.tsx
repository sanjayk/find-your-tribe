import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DomainTags } from './domain-tags';

const mockDomains = ['System Design', 'Product', 'Infrastructure', 'ML / AI'];

describe('DomainTags', () => {
  it('renders without crashing', () => {
    render(<DomainTags domains={mockDomains} />);
  });

  it('renders all domain tags', () => {
    render(<DomainTags domains={mockDomains} />);
    const tags = screen.getAllByTestId('domain-tag');
    expect(tags).toHaveLength(4);
  });

  it('renders correct domain text', () => {
    render(<DomainTags domains={mockDomains} />);
    expect(screen.getByText('System Design')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('ML / AI')).toBeInTheDocument();
  });

  it('returns null for empty domains array', () => {
    const { container } = render(<DomainTags domains={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders with correct background styling', () => {
    render(<DomainTags domains={['Product']} />);
    const tag = screen.getByTestId('domain-tag');
    expect(tag.className).toContain('bg-surface-secondary');
    expect(tag.className).toContain('text-ink-secondary');
  });

  it('renders a single domain tag', () => {
    render(<DomainTags domains={['Infrastructure']} />);
    const tags = screen.getAllByTestId('domain-tag');
    expect(tags).toHaveLength(1);
    expect(tags[0]).toHaveTextContent('Infrastructure');
  });

  it('renders the container with flex-wrap', () => {
    render(<DomainTags domains={mockDomains} />);
    const container = screen.getByTestId('domain-tags');
    expect(container.className).toContain('flex-wrap');
  });

  it('renders rounded tags', () => {
    render(<DomainTags domains={['Product']} />);
    const tag = screen.getByTestId('domain-tag');
    expect(tag.className).toContain('rounded-[6px]');
  });
});
