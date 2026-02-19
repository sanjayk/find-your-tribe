import fs from 'fs';
import os from 'os';
import path from 'path';

export interface TranscriptUsage {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  model: string | null;
  message_count: number;
  duration_s: number;
  version: string | null;
}

export async function parseTranscript(filePath: string): Promise<TranscriptUsage | null> {
  const resolvedPath = filePath.startsWith('~')
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;

  let content: string;
  try {
    content = fs.readFileSync(resolvedPath, 'utf-8');
  } catch {
    return null;
  }

  const lines = content.split('\n');

  let input_tokens = 0;
  let output_tokens = 0;
  let cache_creation_tokens = 0;
  let cache_read_tokens = 0;
  let message_count = 0;
  let model: string | null = null;
  let version: string | null = null;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (entry.type !== 'assistant') continue;
    if (entry.isSidechain === true) continue;

    const message = entry.message as Record<string, unknown> | undefined;
    const usage = message?.usage as Record<string, unknown> | undefined;

    const entryInput = typeof usage?.input_tokens === 'number' ? usage.input_tokens : 0;
    const entryOutput = typeof usage?.output_tokens === 'number' ? usage.output_tokens : 0;
    const entryCacheCreation =
      typeof usage?.cache_creation_input_tokens === 'number'
        ? usage.cache_creation_input_tokens
        : 0;
    const entryCacheRead =
      typeof usage?.cache_read_input_tokens === 'number' ? usage.cache_read_input_tokens : 0;

    input_tokens += entryInput;
    output_tokens += entryOutput;
    cache_creation_tokens += entryCacheCreation;
    cache_read_tokens += entryCacheRead;
    message_count += 1;

    if (model === null && typeof message?.model === 'string') {
      model = message.model;
    }

    if (version === null && typeof entry.version === 'string') {
      version = entry.version;
    }

    if (typeof entry.timestamp === 'string') {
      if (firstTimestamp === null) firstTimestamp = entry.timestamp;
      lastTimestamp = entry.timestamp;
    }
  }

  const total_tokens = input_tokens + output_tokens + cache_creation_tokens + cache_read_tokens;

  if (total_tokens === 0) return null;

  const duration_s =
    firstTimestamp !== null && lastTimestamp !== null
      ? (new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime()) / 1000
      : 0;

  return {
    total_tokens,
    input_tokens,
    output_tokens,
    cache_creation_tokens,
    cache_read_tokens,
    model,
    message_count,
    duration_s,
    version,
  };
}
