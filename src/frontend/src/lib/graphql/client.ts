import { ApolloClient, HttpLink, InMemoryCache, Observable, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { print } from 'graphql';
import { REFRESH_TOKEN } from './mutations/auth';

const STORAGE_KEY = 'tribe_auth';
const GRAPHQL_URI = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8787/graphql';

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function resolvePendingRequests() {
  for (const cb of pendingRequests) cb();
  pendingRequests = [];
}

const httpLink = new HttpLink({ uri: GRAPHQL_URI });

const authLink = setContext((_, { headers }) => {
  if (typeof window === 'undefined') return { headers };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) {
        return {
          headers: { ...headers, Authorization: `Bearer ${accessToken}` },
        };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { headers };
});

const errorLink = onError(({ error, operation, forward }) => {
  if (typeof window === 'undefined') return;

  if (!CombinedGraphQLErrors.is(error)) return;

  const authError = error.errors.find(
    (err) => err.message === 'Authentication required',
  );
  if (!authError) return;

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!stored) return;

  let refreshToken: string | undefined;
  try {
    refreshToken = JSON.parse(stored).refreshToken;
  } catch {
    return;
  }
  if (!refreshToken) return;

  if (isRefreshing) {
    return new Observable((observer) => {
      pendingRequests.push(() => {
        const sub = forward(operation).subscribe(observer);
        return () => sub.unsubscribe();
      });
    });
  }

  isRefreshing = true;

  return new Observable((observer) => {
    fetch(GRAPHQL_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: print(REFRESH_TOKEN),
        variables: { token: refreshToken },
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        const payload = json?.data?.auth?.refreshToken;
        if (!payload?.accessToken) throw new Error('Refresh failed');

        // Update stored tokens
        const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...prev,
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          }),
        );

        // Update the failed operation's headers
        operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
          headers: {
            ...headers,
            Authorization: `Bearer ${payload.accessToken}`,
          },
        }));

        isRefreshing = false;
        resolvePendingRequests();
        forward(operation).subscribe(observer);
      })
      .catch(() => {
        isRefreshing = false;
        pendingRequests = [];
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
      });
  });
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
