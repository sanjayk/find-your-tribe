import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Use vi.hoisted so the mock client is created before the hoisted vi.mock runs
const { mockClient } = vi.hoisted(() => {
  const { ApolloClient, InMemoryCache, HttpLink } = require('@apollo/client');
  return {
    mockClient: new ApolloClient({
      link: new HttpLink({ uri: 'http://localhost:0/graphql' }),
      cache: new InMemoryCache(),
    }),
  };
});

// Mock the client module to return our test client
vi.mock('./client', () => ({
  apolloClient: mockClient,
}));

import { GraphQLProvider } from './provider';
import { useApolloClient } from '@apollo/client/react';

// A helper component that accesses the Apollo client from context
function ClientConsumer() {
  const client = useApolloClient();
  return (
    <span data-testid="client-check">{client ? 'connected' : 'none'}</span>
  );
}

describe('GraphQLProvider', () => {
  it('renders children', () => {
    render(
      <GraphQLProvider>
        <p>Hello world</p>
      </GraphQLProvider>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <GraphQLProvider>
        <p>First child</p>
        <p>Second child</p>
      </GraphQLProvider>,
    );
    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
  });

  it('provides ApolloClient context to descendants', () => {
    render(
      <GraphQLProvider>
        <ClientConsumer />
      </GraphQLProvider>,
    );
    expect(screen.getByTestId('client-check')).toHaveTextContent('connected');
  });

  it('renders nested elements correctly', () => {
    render(
      <GraphQLProvider>
        <div>
          <span>Nested content</span>
        </div>
      </GraphQLProvider>,
    );
    expect(screen.getByText('Nested content')).toBeInTheDocument();
  });
});
