import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes via clsx syntax', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    expect(cn('base', true && 'active')).toBe('base active');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty string inputs', () => {
    expect(cn('', 'foo', '')).toBe('foo');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });

  it('resolves Tailwind conflicts by keeping the last class', () => {
    // tailwind-merge should resolve px-2 vs px-4 to px-4
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('resolves conflicting text colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('resolves conflicting background colors', () => {
    expect(cn('bg-red-100', 'bg-blue-200')).toBe('bg-blue-200');
  });

  it('keeps non-conflicting Tailwind classes', () => {
    expect(cn('px-2', 'py-4', 'text-sm')).toBe('px-2 py-4 text-sm');
  });

  it('handles object syntax from clsx', () => {
    expect(cn({ 'font-bold': true, hidden: false, flex: true })).toBe(
      'font-bold flex',
    );
  });

  it('handles array syntax from clsx', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles mixed clsx input types', () => {
    expect(
      cn('base', ['arr-class'], { 'obj-class': true, removed: false }),
    ).toBe('base arr-class obj-class');
  });

  it('resolves conflicting margin classes', () => {
    expect(cn('mt-2', 'mt-4')).toBe('mt-4');
  });

  it('resolves conflicting padding with responsive variants', () => {
    // Different breakpoints should not conflict
    expect(cn('p-2', 'md:p-4')).toBe('p-2 md:p-4');
  });
});
