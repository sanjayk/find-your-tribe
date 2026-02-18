import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';

describe('Dialog', () => {
  it('renders without crashing', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>,
    );
  });

  it('renders trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
      </Dialog>,
    );
    expect(screen.getByText('Open Dialog')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('renders close button by default', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <p>Content</p>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByText('Content')).toBeInTheDocument();

    await user.click(screen.getByText('Close'));
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders in controlled open state', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Controlled</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Controlled')).toBeInTheDocument();
  });
});

describe('DialogHeader', () => {
  it('renders without crashing', () => {
    render(<DialogHeader />);
  });

  it('renders children content', () => {
    render(<DialogHeader>Header content</DialogHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<DialogHeader />);
    expect(container.querySelector('[data-slot="dialog-header"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<DialogHeader className="header-class" />);
    const el = container.querySelector('[data-slot="dialog-header"]');
    expect(el).toHaveClass('header-class');
  });
});

describe('DialogFooter', () => {
  it('renders without crashing', () => {
    render(<DialogFooter />);
  });

  it('renders children content', () => {
    render(<DialogFooter>Footer content</DialogFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<DialogFooter />);
    expect(container.querySelector('[data-slot="dialog-footer"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<DialogFooter className="footer-class" />);
    const el = container.querySelector('[data-slot="dialog-footer"]');
    expect(el).toHaveClass('footer-class');
  });

  it('renders close button when showCloseButton is true', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter showCloseButton>
            <button>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('DialogTitle', () => {
  it('renders title text inside open dialog', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>My Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const el = screen.getByText('Title').closest('[data-slot="dialog-title"]');
    expect(el).toBeInTheDocument();
  });
});

describe('DialogDescription', () => {
  it('renders description text inside open dialog', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description text</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const el = screen.getByText('Desc').closest('[data-slot="dialog-description"]');
    expect(el).toBeInTheDocument();
  });
});

describe('DialogClose', () => {
  it('renders close trigger', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
          <DialogClose>Dismiss</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });
});
