import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders without crashing', () => {
    render(<Badge>Test</Badge>);
  });

  it('renders children content', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText('Test').closest('[data-slot="badge"]')).toBeInTheDocument();
  });

  it('renders as a span by default', () => {
    render(<Badge>Test</Badge>);
    const el = screen.getByText('Test');
    expect(el.tagName).toBe('SPAN');
  });

  it('applies default variant', () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText('Default');
    expect(el).toHaveAttribute('data-variant', 'default');
  });

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const el = screen.getByText('Secondary');
    expect(el).toHaveAttribute('data-variant', 'secondary');
  });

  it('applies destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const el = screen.getByText('Error');
    expect(el).toHaveAttribute('data-variant', 'destructive');
  });

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const el = screen.getByText('Outline');
    expect(el).toHaveAttribute('data-variant', 'outline');
  });

  it('applies ghost variant', () => {
    render(<Badge variant="ghost">Ghost</Badge>);
    const el = screen.getByText('Ghost');
    expect(el).toHaveAttribute('data-variant', 'ghost');
  });

  it('applies link variant', () => {
    render(<Badge variant="link">Link</Badge>);
    const el = screen.getByText('Link');
    expect(el).toHaveAttribute('data-variant', 'link');
  });

  it('applies shipped variant', () => {
    render(<Badge variant="shipped">Shipped</Badge>);
    const el = screen.getByText('Shipped');
    expect(el).toHaveAttribute('data-variant', 'shipped');
  });

  it('applies in-progress variant', () => {
    render(<Badge variant="in-progress">In Progress</Badge>);
    const el = screen.getByText('In Progress');
    expect(el).toHaveAttribute('data-variant', 'in-progress');
  });

  it('forwards custom className', () => {
    render(<Badge className="custom-badge">Test</Badge>);
    const el = screen.getByText('Test');
    expect(el).toHaveClass('custom-badge');
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>,
    );
    const link = screen.getByText('Link Badge');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });
});
