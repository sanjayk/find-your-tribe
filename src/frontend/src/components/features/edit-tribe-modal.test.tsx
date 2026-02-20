import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUpdateTribe = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...mod,
    useMutation: vi.fn(() => [
      mockUpdateTribe,
      { loading: false, error: undefined, called: false, reset: vi.fn() },
    ]),
  };
});

import { EditTribeModal } from './edit-tribe-modal';
import type { TribeStatus } from '@/lib/graphql/types';

const mockTribe = {
  id: 'tribe-1',
  name: 'Hospitality OS',
  mission: 'Building the operating system for boutique hotels.',
  maxMembers: 8,
  status: 'OPEN' as TribeStatus,
};

describe('EditTribeModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTribe.mockResolvedValue({
      data: { tribes: { updateTribe: { ...mockTribe } } },
    });
  });

  it('renders pre-filled form fields matching tribe prop', () => {
    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    expect(screen.getByDisplayValue('Hospitality OS')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'Building the operating system for boutique hotels.'
      )
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('status radio group shows all three options', () => {
    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    expect(screen.getByRole('radio', { name: /open/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /alumni/i })).toBeInTheDocument();
  });

  it('current status is pre-selected', () => {
    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    expect(screen.getByRole('radio', { name: /open/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /active/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /alumni/i })).not.toBeChecked();
  });

  it('pre-selects ACTIVE status when tribe status is ACTIVE', () => {
    render(
      <EditTribeModal
        isOpen={true}
        tribe={{ ...mockTribe, status: 'ACTIVE' as TribeStatus }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('radio', { name: /active/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /open/i })).not.toBeChecked();
  });

  it('changing status updates the radio selection', async () => {
    const user = userEvent.setup();
    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    const activeRadio = screen.getByRole('radio', { name: /active/i });
    await user.click(activeRadio);

    expect(activeRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /open/i })).not.toBeChecked();
  });

  it('submit calls UPDATE_TRIBE mutation', async () => {
    const user = userEvent.setup();
    render(
      <EditTribeModal
        isOpen={true}
        tribe={mockTribe}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateTribe).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ id: 'tribe-1' }),
        })
      );
    });
  });

  it('danger zone section renders with archive button', () => {
    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /archive this tribe/i })
    ).toBeInTheDocument();
  });

  it('archive button triggers confirmation dialog', async () => {
    const user = userEvent.setup();
    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    await user.click(
      screen.getByRole('button', { name: /archive this tribe/i })
    );

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('calls onUpdated callback after successful update', async () => {
    const user = userEvent.setup();
    render(
      <EditTribeModal
        isOpen={true}
        tribe={mockTribe}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled();
    });
  });

  it('shows error message when mutation fails', async () => {
    const user = userEvent.setup();
    mockUpdateTribe.mockRejectedValue(new Error('Network error'));

    render(
      <EditTribeModal isOpen={true} tribe={mockTribe} onClose={mockOnClose} />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
