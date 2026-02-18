import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu';

describe('DropdownMenu', () => {
  it('renders without crashing', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      </DropdownMenu>,
    );
  });

  it('renders trigger', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
      </DropdownMenu>,
    );
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('opens menu when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('does not show content before opening', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Hidden Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.queryByText('Hidden Item')).not.toBeInTheDocument();
  });
});

describe('DropdownMenuItem', () => {
  it('renders menu item with correct role', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Action</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('menuitem', { name: 'Action' })).toBeInTheDocument();
  });

  it('applies destructive variant', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    const item = screen.getByRole('menuitem', { name: 'Delete' });
    expect(item).toHaveAttribute('data-variant', 'destructive');
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={handleSelect}>Click Me</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    await user.click(screen.getByRole('menuitem', { name: 'Click Me' }));
    expect(handleSelect).toHaveBeenCalledOnce();
  });

  it('renders disabled item', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    const item = screen.getByRole('menuitem', { name: 'Disabled Item' });
    expect(item).toHaveAttribute('data-disabled', '');
  });
});

describe('DropdownMenuLabel', () => {
  it('renders label text', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByText('My Account')).toBeInTheDocument();
  });
});

describe('DropdownMenuSeparator', () => {
  it('renders separator with correct role', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

describe('DropdownMenuShortcut', () => {
  it('renders shortcut text', () => {
    render(<DropdownMenuShortcut>Ctrl+K</DropdownMenuShortcut>);
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<DropdownMenuShortcut>Ctrl+K</DropdownMenuShortcut>);
    expect(container.querySelector('[data-slot="dropdown-menu-shortcut"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(
      <DropdownMenuShortcut className="shortcut-class">Ctrl+K</DropdownMenuShortcut>,
    );
    const el = container.querySelector('[data-slot="dropdown-menu-shortcut"]');
    expect(el).toHaveClass('shortcut-class');
  });
});

describe('DropdownMenuGroup', () => {
  it('renders grouped items', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Grouped Item</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('menuitem', { name: 'Grouped Item' })).toBeInTheDocument();
  });
});

describe('DropdownMenuCheckboxItem', () => {
  it('renders checkbox item', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Show Status</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show Status' })).toBeInTheDocument();
  });

  it('renders checked state', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    const item = screen.getByRole('menuitemcheckbox', { name: 'Checked' });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('renders unchecked state', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false}>Unchecked</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    const item = screen.getByRole('menuitemcheckbox', { name: 'Unchecked' });
    expect(item).toHaveAttribute('aria-checked', 'false');
  });
});

describe('DropdownMenuRadioGroup and DropdownMenuRadioItem', () => {
  it('renders radio items', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('menuitemradio', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Option B' })).toBeInTheDocument();
  });

  it('marks selected radio item', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('menuitemradio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Option B' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('DropdownMenuSub', () => {
  it('renders sub trigger', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText('Open'));
    expect(screen.getByText('More Options')).toBeInTheDocument();
  });
});
