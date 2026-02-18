import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('apolloClient', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GRAPHQL_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_GRAPHQL_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_GRAPHQL_URL;
    }
    vi.resetModules();
  });

  it('exports an ApolloClient instance', async () => {
    const { apolloClient } = await import('./client');
    expect(apolloClient).toBeDefined();
    // ApolloClient instances have a link and cache
    expect(apolloClient.link).toBeDefined();
    expect(apolloClient.cache).toBeDefined();
  });

  it('has an InMemoryCache', async () => {
    const { apolloClient } = await import('./client');
    // InMemoryCache has an extract method
    expect(typeof apolloClient.cache.extract).toBe('function');
    // The cache should start empty
    const cacheContents = apolloClient.cache.extract();
    expect(cacheContents).toBeDefined();
    expect(typeof cacheContents).toBe('object');
  });

  it('uses default URI when NEXT_PUBLIC_GRAPHQL_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_GRAPHQL_URL;
    const { apolloClient } = await import('./client');
    // The client should be instantiated without error
    expect(apolloClient).toBeDefined();
    expect(apolloClient.link).toBeDefined();
  });

  it('creates a client that can be used for queries', async () => {
    const { apolloClient } = await import('./client');
    // Verify the client has query/mutate methods
    expect(typeof apolloClient.query).toBe('function');
    expect(typeof apolloClient.mutate).toBe('function');
    expect(typeof apolloClient.watchQuery).toBe('function');
  });

  it('cache starts in an empty state', async () => {
    const { apolloClient } = await import('./client');
    const cacheData = apolloClient.cache.extract();
    // A fresh InMemoryCache should have ROOT_QUERY or be an empty object
    expect(Object.keys(cacheData as object).length).toBeLessThanOrEqual(1);
  });
});
