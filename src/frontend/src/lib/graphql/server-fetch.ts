/**
 * Server-side GraphQL fetch for use in generateMetadata() and Server Components.
 * Does NOT use Apollo Client (which requires React context).
 */
export async function serverQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  try {
    const res = await fetch(
      process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 60 },
      }
    );
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}
