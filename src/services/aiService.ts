import type { StreamGenerationRequest, SseEvent, GenerationDetail } from '../types/ai';
import api from './api';

export interface StorylineSuggestion {
  title: string;
  prompt: string;
}

export async function getStorylineSuggestions(novelId: string, episodeId?: string): Promise<StorylineSuggestion[]> {
  const { data } = await api.post<StorylineSuggestion[]>('/story-generations/suggestions', {
    novelId,
    ...(episodeId ? { episodeId } : {}),
  });
  return data;
}

export async function getGeneration(id: string): Promise<GenerationDetail> {
  const { data } = await api.get<GenerationDetail>(`/story-generations/${id}`);
  return data;
}

export async function listEpisodeGenerations(episodeId: string): Promise<GenerationDetail[]> {
  const { data } = await api.get<GenerationDetail[]>('/story-generations', { params: { episodeId } });
  return data;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Streams AI story generation via fetch + ReadableStream.
 * The API uses POST returning an SSE-like stream (NestJS @Sse via Subject observable).
 * We parse newline-delimited JSON — each line is `data: <json>`.
 *
 * @param request - The generation request payload
 * @param onEvent - Callback called for each parsed SSE event
 * @param signal - AbortController signal to cancel the stream
 */
export async function streamStoryGeneration(
  request: StreamGenerationRequest,
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/story-generations/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Generation failed: ${response.status} — ${errText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // SSE format: "data: <json>"
        const jsonStr = trimmed.startsWith('data:')
          ? trimmed.slice(5).trim()
          : trimmed;

        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as SseEvent;
          onEvent(event);
        } catch {
          // ignore malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
