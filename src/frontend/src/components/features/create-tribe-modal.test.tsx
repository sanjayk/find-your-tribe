import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTribeModal } from './create-tribe-modal';

// Mock Apollo Client hooks
const mockCreateTribe = vi.fn();
const mockAddOpenRole = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (mutation: { definitions: Array<{ name: { value: string } }> }) => {
    const operationName = mutation?.definitions?.[0]?.name?.value;
    if (operationName === 'CreateTribe') {
      return [mockCreateTribe, { loading: false }];
    }
    if (operationName === 'AddOpenRole') {
      return [mockAddOpenRole, { loading: false }];
    }
    return [vi.fn(), { loading: false }];
  },
}));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => {
    const text = strings.join('');
    const match = text.match(/(?:mutation|query)\s+(\w+)/);
    return {
      definitions: [{ name: { value: match?.[1] ?? 'Unknown' } }],
    };
  },
}));

describe('CreateTribeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTribe.mockReset();
    mockAddOpenRole.mockReset();
  });

  it('renders form fields (name, mission, max members)', () => {
    render(<CreateTribeModal {...defaultProps} />);

    expect(screen.getByLabelText(/tribe name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mission/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max members/i)).toBeInTheDocument();
  });

  it('renders overline and title with correct styling', () => {
    render(<CreateTribeModal {...defaultProps} />);

    expect(screen.getByText('CREATE TRIBE')).toBeInTheDocument();
    const title = screen.getByRole('heading', { name: /form your team/i });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('font-serif');
  });

  it('renders mission field with placeholder', () => {
    render(<CreateTribeModal {...defaultProps} />);

    const textarea = screen.getByLabelText(/mission/i);
    expect(textarea).toHaveAttribute(
      'placeholder',
      'What are you building and why?'
    );
  });

  it('renders max members field with min value of 1', () => {
    render(<CreateTribeModal {...defaultProps} />);

    const input = screen.getByLabelText(/max members/i);
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '1');
  });

  it('name field is required — shows error on empty submit', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /create tribe/i });
    await user.click(submitButton);

    expect(screen.getByText(/tribe name is required/i)).toBeInTheDocument();
    expect(mockCreateTribe).not.toHaveBeenCalled();
  });

  it('can add open role cards', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);

    // Should see a role card with title and skills fields
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skills/i)).toBeInTheDocument();
  });

  it('can add multiple open role cards', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);
    await user.click(addButton);

    const titleInputs = screen.getAllByLabelText(/title/i);
    expect(titleInputs).toHaveLength(2);
  });

  it('can remove individual role cards', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    // Add two roles
    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);
    await user.click(addButton);

    expect(screen.getAllByLabelText(/title/i)).toHaveLength(2);

    // Remove the first role
    const removeButtons = screen.getAllByRole('button', {
      name: /remove role/i,
    });
    await user.click(removeButtons[0]);

    expect(screen.getAllByLabelText(/title/i)).toHaveLength(1);
  });

  it('shows role title and skills fields in each card', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);

    // Each role card should have both title and skills
    const roleCard = screen.getByTestId('role-card-0');
    expect(within(roleCard).getByLabelText(/title/i)).toBeInTheDocument();
    expect(within(roleCard).getByLabelText(/skills/i)).toBeInTheDocument();
  });

  it('can add skills as tags via Enter key', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    // Add a role first
    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);

    const skillsInput = screen.getByLabelText(/skills/i);
    await user.type(skillsInput, 'Python{Enter}');

    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('can add skills as tags via comma', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);

    const skillsInput = screen.getByLabelText(/skills/i);
    await user.type(skillsInput, 'React,');

    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('can remove skill tags', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);

    const skillsInput = screen.getByLabelText(/skills/i);
    await user.type(skillsInput, 'Python{Enter}');
    expect(screen.getByText('Python')).toBeInTheDocument();

    // Click the remove button on the tag
    const removeTag = screen.getByRole('button', {
      name: /remove python/i,
    });
    await user.click(removeTag);

    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });

  it('renders role cards with surface-secondary background', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: /add another role/i,
    });
    await user.click(addButton);

    const roleCard = screen.getByTestId('role-card-0');
    expect(roleCard).toHaveClass('bg-surface-secondary');
  });

  it('renders Cancel and Create Tribe buttons', () => {
    render(<CreateTribeModal {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /cancel/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create tribe/i })
    ).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateTribeModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls CREATE_TRIBE then ADD_OPEN_ROLE on successful submit', async () => {
    const user = userEvent.setup();
    mockCreateTribe.mockResolvedValue({
      data: {
        tribes: {
          createTribe: {
            id: 'tribe-123',
            name: 'Test Tribe',
            mission: 'Test mission',
            status: 'OPEN',
            maxMembers: 5,
          },
        },
      },
    });
    mockAddOpenRole.mockResolvedValue({
      data: {
        tribes: {
          addOpenRole: {
            id: 'role-1',
            title: 'Backend Engineer',
            skillsNeeded: ['Python'],
            filled: false,
          },
        },
      },
    });

    render(<CreateTribeModal {...defaultProps} />);

    // Fill in name
    await user.type(screen.getByLabelText(/tribe name/i), 'Test Tribe');
    await user.type(screen.getByLabelText(/mission/i), 'Test mission');

    // Add a role
    await user.click(
      screen.getByRole('button', { name: /add another role/i })
    );
    await user.type(screen.getByLabelText(/title/i), 'Backend Engineer');
    await user.type(screen.getByLabelText(/skills/i), 'Python{Enter}');

    // Submit
    await user.click(screen.getByRole('button', { name: /create tribe/i }));

    expect(mockCreateTribe).toHaveBeenCalledWith({
      variables: {
        name: 'Test Tribe',
        mission: 'Test mission',
        maxMembers: 5,
      },
    });

    expect(mockAddOpenRole).toHaveBeenCalledWith({
      variables: {
        tribeId: 'tribe-123',
        title: 'Backend Engineer',
        skillsNeeded: ['Python'],
      },
    });

    expect(defaultProps.onCreated).toHaveBeenCalledWith('tribe-123');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<CreateTribeModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Form your team')).not.toBeInTheDocument();
  });

  it('resets form when modal closes and reopens', async () => {
    const { rerender } = render(<CreateTribeModal {...defaultProps} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/tribe name/i), 'Draft Tribe');

    // Close and reopen
    rerender(<CreateTribeModal {...defaultProps} isOpen={false} />);
    rerender(<CreateTribeModal {...defaultProps} isOpen={true} />);

    const nameInput = screen.getByLabelText(/tribe name/i);
    expect(nameInput).toHaveValue('');
  });
});
