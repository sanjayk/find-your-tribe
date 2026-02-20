import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mutable state for controlling mock useQuery behavior across tests
let mockTagSuggestions: string[] = ['React', 'TypeScript', 'Next.js'];
let mockLoading = false;

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: { tagSuggestions: mockTagSuggestions },
    loading: mockLoading,
    error: undefined,
  }),
}));

import { TagTypeahead } from './tag-typeahead';

describe('TagTypeahead', () => {
  const mockOnTagsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTagSuggestions = ['React', 'TypeScript', 'Next.js'];
    mockLoading = false;
  });

  it('renders without crashing with empty selected tags', () => {
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('renders selected tags as removable pills', () => {
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={['React', 'TypeScript']}
        onTagsChange={mockOnTagsChange}
      />
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove React' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove TypeScript' })).toBeInTheDocument();
  });

  it('calls onTagsChange with remaining tags when a pill is removed', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={['React', 'TypeScript']}
        onTagsChange={mockOnTagsChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove React' }));

    expect(mockOnTagsChange).toHaveBeenCalledWith(['TypeScript']);
  });

  it('shows dropdown suggestions when input is focused', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TypeScript' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next.js' })).toBeInTheDocument();
  });

  it('calls onTagsChange when a suggestion is selected from the dropdown', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    await user.click(screen.getByRole('combobox'));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'React' }));

    expect(mockOnTagsChange).toHaveBeenCalledWith(['React']);
  });

  it('adds a custom tag (not in suggestions) when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'Vue{Enter}');

    expect(mockOnTagsChange).toHaveBeenCalledWith(['Vue']);
  });

  it('removes the last tag when Backspace is pressed with empty input', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={['React', 'TypeScript']}
        onTagsChange={mockOnTagsChange}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Backspace}');

    expect(mockOnTagsChange).toHaveBeenCalledWith(['React']);
  });

  it('navigates dropdown with arrow keys and selects with Enter', async () => {
    const user = userEvent.setup();
    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(mockOnTagsChange).toHaveBeenCalledWith(['React']);
  });

  it('renders label text when the label prop is provided', () => {
    render(
      <TagTypeahead
        field="domains"
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
        label="DOMAINS"
      />
    );

    expect(screen.getByText('DOMAINS')).toBeInTheDocument();
  });

  it('filters already-selected tags from dropdown suggestions', async () => {
    const user = userEvent.setup();
    mockTagSuggestions = ['React', 'TypeScript', 'Next.js'];

    render(
      <TagTypeahead
        field="tech_stack"
        selectedTags={['React']}
        onTagsChange={mockOnTagsChange}
      />
    );

    await user.click(screen.getByRole('combobox'));

    // React is already selected, so it should not appear as a dropdown button
    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument();
    // Unselected suggestions are still available
    expect(screen.getByRole('button', { name: 'TypeScript' })).toBeInTheDocument();
  });

  it('accepts all valid field types without error', () => {
    const fields: Array<'tech_stack' | 'domains' | 'ai_tools' | 'build_style' | 'services'> = [
      'tech_stack',
      'domains',
      'ai_tools',
      'build_style',
      'services',
    ];

    fields.forEach((field) => {
      const { unmount } = render(
        <TagTypeahead
          field={field}
          selectedTags={[]}
          onTagsChange={mockOnTagsChange}
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      unmount();
    });
  });
});
