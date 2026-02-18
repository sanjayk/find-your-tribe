import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs', () => {
  it('renders without crashing', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>,
    );
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>,
    );
    expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument();
  });

  it('renders tab triggers', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">First</TabsTrigger>
          <TabsTrigger value="tab2">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second' })).toBeInTheDocument();
  });

  it('shows content for the default tab', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">First content</TabsContent>
        <TabsContent value="tab2">Second content</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('First content')).toBeInTheDocument();
  });

  it('switches content when a different tab is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">First content</TabsContent>
        <TabsContent value="tab2">Second content</TabsContent>
      </Tabs>,
    );

    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
    expect(screen.getByText('Second content')).toBeInTheDocument();
  });

  it('marks the active tab with selected state', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'false');
  });

  it('updates selected state when switching tabs', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('forwards custom className to Tabs', () => {
    const { container } = render(
      <Tabs defaultValue="tab1" className="tabs-class">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs"]');
    expect(el).toHaveClass('tabs-class');
  });

  it('applies horizontal orientation by default', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs"]');
    expect(el).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('applies vertical orientation', () => {
    const { container } = render(
      <Tabs defaultValue="tab1" orientation="vertical">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs"]');
    expect(el).toHaveAttribute('data-orientation', 'vertical');
  });
});

describe('TabsList', () => {
  it('has the correct data-slot attribute', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    expect(container.querySelector('[data-slot="tabs-list"]')).toBeInTheDocument();
  });

  it('renders with tablist role', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs-list"]');
    expect(el).toHaveAttribute('data-variant', 'default');
  });

  it('applies line variant', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList variant="line">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs-list"]');
    expect(el).toHaveAttribute('data-variant', 'line');
  });

  it('forwards custom className', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList className="list-class">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs-list"]');
    expect(el).toHaveClass('list-class');
  });
});

describe('TabsTrigger', () => {
  it('has the correct data-slot attribute', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    expect(container.querySelector('[data-slot="tabs-trigger"]')).toBeInTheDocument();
  });

  it('renders with tab role', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">My Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'My Tab' })).toBeInTheDocument();
  });

  it('supports disabled state', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>
            Disabled Tab
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Disabled Tab' })).toBeDisabled();
  });
});

describe('TabsContent', () => {
  it('has the correct data-slot attribute', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    expect(container.querySelector('[data-slot="tabs-content"]')).toBeInTheDocument();
  });

  it('renders with tabpanel role', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Panel content</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="content-class">
          Content
        </TabsContent>
      </Tabs>,
    );
    const el = container.querySelector('[data-slot="tabs-content"]');
    expect(el).toHaveClass('content-class');
  });
});

describe('Tabs keyboard navigation', () => {
  it('supports keyboard navigation between tabs', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    await user.click(tab1);
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
  });
});
