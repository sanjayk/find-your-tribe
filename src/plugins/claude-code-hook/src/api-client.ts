import { readConfig } from './config.js';

const DEFAULT_API_URL = 'https://api.findyourtribe.dev';

export interface BurnIngestRequest {
  tokens_burned: number;
  source: string;
  verification: string;
  tool?: string;
  activity_date?: string;
  session_id?: string;
  project_hint?: string;
  token_precision?: string;
  metadata?: Record<string, unknown>;
}

export interface BurnIngestResponse {
  status: string;
  burn_id: string;
  project_id?: string;
  project_matched: boolean;
  day_total: number;
}

function getApiUrl(): string {
  const config = readConfig();
  return config.api_url ?? DEFAULT_API_URL;
}

export async function ingestBurn(
  apiToken: string,
  payload: BurnIngestRequest,
): Promise<Response> {
  const apiUrl = getApiUrl();
  return fetch(`${apiUrl}/api/burn/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function verifyToken(apiToken: string): Promise<Response> {
  const apiUrl = getApiUrl();
  return fetch(`${apiUrl}/api/burn/verify-token`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
}
