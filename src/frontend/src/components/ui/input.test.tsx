import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders without crashing', () => {
    render(<Input />);
  });

  it('renders as an input element', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input').tagName).toBe('INPUT');
  });

  it('has the correct data-slot attribute', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('data-slot', 'input');
  });

  it('renders with text type by default', () => {
    render(<Input data-testid="input" />);
    // When no type is specified, input defaults to text
    expect(screen.getByTestId('input')).not.toHaveAttribute('type');
  });

  it('renders with specified type', () => {
    render(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
  });

  it('renders password type', () => {
    render(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
  });

  it('renders number type', () => {
    render(<Input type="number" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('renders with value', () => {
    render(<Input defaultValue="hello" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveValue('hello');
  });

  it('handles user typing', async () => {
    const user = userEvent.setup();
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');

    await user.type(input, 'test value');
    expect(input).toHaveValue('test value');
  });

  it('calls onChange when value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} data-testid="input" />);

    await user.type(screen.getByTestId('input'), 'a');
    expect(handleChange).toHaveBeenCalledOnce();
  });

  it('renders as disabled', () => {
    render(<Input disabled data-testid="input" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('renders as required', () => {
    render(<Input required data-testid="input" />);
    expect(screen.getByTestId('input')).toBeRequired();
  });

  it('renders as readonly', () => {
    render(<Input readOnly data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('readonly');
  });

  it('forwards custom className', () => {
    render(<Input className="custom-input" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('custom-input');
  });

  it('forwards aria-label', () => {
    render(<Input aria-label="Search" />);
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('forwards name attribute', () => {
    render(<Input name="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('name', 'email');
  });

  it('forwards aria-invalid for error state', () => {
    render(<Input aria-invalid="true" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not allow typing when disabled', async () => {
    const user = userEvent.setup();
    render(<Input disabled data-testid="input" />);
    const input = screen.getByTestId('input');

    await user.type(input, 'test');
    expect(input).toHaveValue('');
  });
});
