import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock next/font/google to avoid actual font loading in tests
vi.mock('next/font/google', () => ({
  DM_Serif_Display: () => ({
    style: { fontFamily: 'DM Serif Display' },
    variable: '--font-serif',
  }),
  DM_Sans: () => ({
    style: { fontFamily: 'DM Sans' },
    variable: '--font-sans',
  }),
  IBM_Plex_Mono: () => ({
    style: { fontFamily: 'IBM Plex Mono' },
    variable: '--font-mono',
  }),
}));

// Mock the Nav component
vi.mock('@/components/layout/nav', () => ({
  default: () => <nav data-testid="nav">Nav</nav>,
}));

// Mock the Footer component
vi.mock('@/components/layout/footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

// Mock the GraphQL provider to avoid needing a real Apollo Client
vi.mock('@/lib/graphql/provider', () => ({
  GraphQLProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="graphql-provider">{children}</div>
  ),
}));

// Import after mocks so mocked dependencies are used
import RootLayout, { metadata } from './layout';

/**
 * RootLayout renders <html> and <body> tags. In jsdom, React cannot render
 * <html> or <body> as children of a container div — they get hoisted into
 * the document. We test via document.documentElement for <html>-level
 * attributes, and use the rendered container for content assertions.
 */
describe('RootLayout', () => {
  it('renders children', () => {
    const { container } = render(
      <RootLayout>
        <main>Page content</main>
      </RootLayout>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(container.innerHTML).toContain('Page content');
  });

  it('renders the Nav component', () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>,
    );
    expect(screen.getByTestId('nav')).toBeInTheDocument();
  });

  it('renders the Footer component', () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>,
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('wraps content in GraphQLProvider', () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>,
    );
    expect(screen.getByTestId('graphql-provider')).toBeInTheDocument();
  });

  it('renders Nav before children and children before Footer', () => {
    render(
      <RootLayout>
        <main data-testid="main-content">Content</main>
      </RootLayout>,
    );
    const provider = screen.getByTestId('graphql-provider');
    const children = Array.from(provider.children);
    const navIndex = children.findIndex(
      (c) => (c as HTMLElement).dataset.testid === 'nav',
    );
    const mainIndex = children.findIndex(
      (c) => (c as HTMLElement).dataset.testid === 'main-content',
    );
    const footerIndex = children.findIndex(
      (c) => (c as HTMLElement).dataset.testid === 'footer',
    );
    expect(navIndex).toBeLessThan(mainIndex);
    expect(mainIndex).toBeLessThan(footerIndex);
  });

  it('sets lang="en" on the html element', () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>,
    );
    // jsdom hoists the <html> element — check document.documentElement
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('sets font CSS custom properties on the html element', () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>,
    );
    const htmlEl = document.documentElement;
    expect(htmlEl.style.getPropertyValue('--font-serif')).toBe(
      'DM Serif Display',
    );
    expect(htmlEl.style.getPropertyValue('--font-sans')).toBe('DM Sans');
    expect(htmlEl.style.getPropertyValue('--font-mono')).toBe('IBM Plex Mono');
  });
});

describe('metadata', () => {
  it('has a title', () => {
    expect(metadata.title).toBe('Find Your Tribe');
  });

  it('has a description', () => {
    expect(metadata.description).toContain('social network');
    expect(metadata.description).toContain('shipping');
  });
});
