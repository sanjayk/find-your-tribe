import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUpdateProject = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: { tagSuggestions: [] },
    loading: false,
    error: undefined,
  }),
  useMutation: () => [mockUpdateProject, { loading: false }],
}));

import { BuiltWithSection } from './built-with-section';

const FULL_PROPS = {
  domains: ['SaaS', 'DevTools'],
  aiTools: ['Claude', 'Cursor'],
  buildStyle: ['Vibe Coding', 'TDD'],
  services: ['Stripe', 'Vercel'],
};

const EMPTY_PROPS = {
  domains: [],
  aiTools: [],
  buildStyle: [],
  services: [],
};

describe('BuiltWithSection', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four tag groups when data is present', () => {
    render(<BuiltWithSection {...FULL_PROPS} />);

    expect(screen.getByText('Domains')).toBeInTheDocument();
    expect(screen.getByText('AI Tools')).toBeInTheDocument();
    expect(screen.getByText('Build Style')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();

    expect(screen.getByText('SaaS')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('Vibe Coding')).toBeInTheDocument();
    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });

  it('hides empty groups in visitor mode', () => {
    render(
      <BuiltWithSection
        domains={['SaaS']}
        aiTools={[]}
        buildStyle={[]}
        services={[]}
      />
    );

    expect(screen.getByText('Domains')).toBeInTheDocument();
    expect(screen.queryByText('AI Tools')).not.toBeInTheDocument();
    expect(screen.queryByText('Build Style')).not.toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });

  it('hides entire section when all groups are empty in visitor mode', () => {
    const { container } = render(<BuiltWithSection {...EMPTY_PROPS} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows prompts for empty groups in owner mode', () => {
    render(<BuiltWithSection {...EMPTY_PROPS} editable />);

    expect(screen.getByRole('button', { name: 'Add Domains' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add AI Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Build Style' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Services' })).toBeInTheDocument();
  });

  it('shows pencil icon for populated groups in owner mode', () => {
    render(<BuiltWithSection {...FULL_PROPS} editable />);

    expect(screen.getByRole('button', { name: 'Edit Domains' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit AI Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Build Style' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Services' })).toBeInTheDocument();
  });

  it('shows TagTypeahead when clicking the add button in owner mode', async () => {
    const user = userEvent.setup();
    render(<BuiltWithSection {...EMPTY_PROPS} editable />);

    await user.click(screen.getByRole('button', { name: 'Add Domains' }));

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows TagTypeahead when clicking the pencil edit button in owner mode', async () => {
    const user = userEvent.setup();
    render(<BuiltWithSection {...FULL_PROPS} editable />);

    await user.click(screen.getByRole('button', { name: 'Edit AI Tools' }));

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls onUpdate with the field name and new tags when tags change', async () => {
    const user = userEvent.setup();
    render(
      <BuiltWithSection
        {...EMPTY_PROPS}
        editable
        onUpdate={mockOnUpdate}
      />
    );

    // Open the Domains TagTypeahead
    await user.click(screen.getByRole('button', { name: 'Add Domains' }));

    const input = screen.getByRole('combobox');
    await user.type(input, 'EdTech{Enter}');

    expect(mockOnUpdate).toHaveBeenCalledWith('domains', ['EdTech']);
  });

  it('calls UPDATE_PROJECT mutation with projectId and updated field when projectId is provided', async () => {
    const user = userEvent.setup();
    render(
      <BuiltWithSection
        {...EMPTY_PROPS}
        editable
        projectId="proj-123"
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add AI Tools' }));
    const input = screen.getByRole('combobox');
    await user.type(input, 'Claude{Enter}');

    expect(mockUpdateProject).toHaveBeenCalledWith({
      variables: {
        id: 'proj-123',
        input: { aiTools: ['Claude'] },
      },
    });
  });

  it('does not call UPDATE_PROJECT mutation when projectId is not provided', async () => {
    const user = userEvent.setup();
    render(
      <BuiltWithSection
        {...EMPTY_PROPS}
        editable
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Domains' }));
    const input = screen.getByRole('combobox');
    await user.type(input, 'SaaS{Enter}');

    expect(mockUpdateProject).not.toHaveBeenCalled();
  });

  it('applies accent-subtle styling to AI Tools pills', () => {
    render(<BuiltWithSection {...FULL_PROPS} />);

    const claudePill = screen.getByText('Claude');
    expect(claudePill.className).toContain('bg-accent-subtle');
    expect(claudePill.className).toContain('text-accent');
  });

  it('applies surface-secondary styling to Domains pills', () => {
    render(<BuiltWithSection {...FULL_PROPS} />);

    const saasPill = screen.getByText('SaaS');
    expect(saasPill.className).toContain('bg-surface-secondary');
  });
});
