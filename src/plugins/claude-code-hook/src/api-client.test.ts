import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readConfig } from './config.js';
import { ingestBurn, verifyToken } from './api-client.js';

vi.mock('./config.js', () => ({
  readConfig: vi.fn(() => ({})),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ingestBurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readConfig).mockReturnValue({});
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('POSTs to the default ingest endpoint with Bearer auth', async () => {
    const payload = { tokens_burned: 100, source: 'claude-code', verification: 'v1' };

    await ingestBurn('tok_test_123', payload);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.findyourtribe.dev/api/burn/ingest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_test_123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
      }),
    );
  });

  it('uses api_url from config when set', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_url: 'https://custom.example.com' });

    const payload = { tokens_burned: 50, source: 'test', verification: 'v1' };
    await ingestBurn('tok_test', payload);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.example.com/api/burn/ingest',
      expect.anything(),
    );
  });

  it('serializes the full payload as JSON body', async () => {
    const payload = {
      tokens_burned: 200,
      source: 'claude-code',
      verification: 'sha256:abc',
      tool: 'Bash',
      session_id: 'sess_xyz',
      project_hint: 'my-project',
    };

    await ingestBurn('tok_test', payload);

    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    expect(callArgs.body).toBe(JSON.stringify(payload));
  });

  it('returns the raw Response from fetch', async () => {
    const mockResponse = new Response('{"status":"ok"}', { status: 201 });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await ingestBurn('tok_test', {
      tokens_burned: 10,
      source: 'test',
      verification: 'v1',
    });

    expect(result).toBe(mockResponse);
  });
});

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readConfig).mockReturnValue({});
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('GETs the verify-token endpoint with Bearer auth', async () => {
    await verifyToken('tok_verify_456');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.findyourtribe.dev/api/burn/verify-token',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_verify_456',
        }),
      }),
    );
  });

  it('uses api_url from config when set', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_url: 'https://staging.example.com' });

    await verifyToken('tok_verify');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://staging.example.com/api/burn/verify-token',
      expect.anything(),
    );
  });

  it('returns the raw Response from fetch', async () => {
    const mockResponse = new Response('{"valid":true}', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await verifyToken('tok_test');

    expect(result).toBe(mockResponse);
  });
});
