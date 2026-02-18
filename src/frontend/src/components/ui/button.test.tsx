import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders without crashing', () => {
    render(<Button>Click me</Button>);
  });

  it('renders children content', () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
  });

  it('renders as a button element by default', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button').tagName).toBe('BUTTON');
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  // Variant tests
  it('applies default variant', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default');
  });

  it('applies destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'destructive');
  });

  it('applies outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline');
  });

  it('applies secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');
  });

  it('applies ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost');
  });

  it('applies link variant', () => {
    render(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'link');
  });

  // Size tests
  it('applies default size', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'default');
  });

  it('applies xs size', () => {
    render(<Button size="xs">XS</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'xs');
  });

  it('applies sm size', () => {
    render(<Button size="sm">SM</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
  });

  it('applies lg size', () => {
    render(<Button size="lg">LG</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('applies icon size', () => {
    render(<Button size="icon">I</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon');
  });

  // Disabled state
  it('renders as disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire click when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // className forwarding
  it('forwards custom className', () => {
    render(<Button className="custom-btn">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-btn');
  });

  // asChild
  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByText('Link Button');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });

  // HTML attribute forwarding
  it('forwards type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('forwards aria-label', () => {
    render(<Button aria-label="Close dialog">X</Button>);
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });
});
