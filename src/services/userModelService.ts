import api from './api';
import type {
  UserModelConfig,
  CreateUserModelDto,
  UpdateUserModelDto,
  TestModelDto,
  TestModelResponse,
} from '../types/model';

export const userModelService = {
  /** GET /user-models */
  async getAll(): Promise<UserModelConfig[]> {
    const { data } = await api.get<UserModelConfig[]>('/user-models');
    return data;
  },

  /** GET /user-models/:id */
  async getOne(id: string): Promise<UserModelConfig> {
    const { data } = await api.get<UserModelConfig>(`/user-models/${id}`);
    return data;
  },

  /** POST /user-models */
  async create(dto: CreateUserModelDto): Promise<UserModelConfig> {
    const { data } = await api.post<UserModelConfig>('/user-models', dto);
    return data;
  },

  /** PATCH /user-models/:id */
  async update(id: string, dto: UpdateUserModelDto): Promise<UserModelConfig> {
    const { data } = await api.patch<UserModelConfig>(`/user-models/${id}`, dto);
    return data;
  },

  /** DELETE /user-models/:id */
  async remove(id: string): Promise<void> {
    await api.delete(`/user-models/${id}`);
  },

  /** POST /user-models/:id/set-default */
  async setDefault(id: string): Promise<void> {
    await api.post(`/user-models/${id}/set-default`);
  },

  /** POST /user-models/test */
  async testConnection(dto: TestModelDto): Promise<TestModelResponse> {
    const { data } = await api.post<TestModelResponse>('/user-models/test', dto);
    return data;
  },

  async getOllamaStatus(): Promise<{ reachable: boolean; baseUrl: string }> {
    const { data } = await api.get<{ reachable: boolean; baseUrl: string }>('/user-models/ollama/status');
    return data;
  },

  async getOllamaModels(): Promise<Array<{ name: string; sizeBytes: number }>> {
    const { data } = await api.get<Array<{ name: string; sizeBytes: number }>>('/user-models/ollama/models');
    return data;
  },

  async pullOllamaModel(name: string, onProgress: (event: { status?: string; completed?: number; total?: number; error?: string }) => void, signal?: AbortSignal): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/user-models/ollama/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name }),
      signal,
    });
    if (!response.ok) throw new Error(`Ollama pull failed: ${response.status}`);
    if (!response.body) throw new Error('Ollama pull returned no progress stream');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split('\n\n');
        buffer = done ? '' : (frames.pop() ?? '');
        for (const frame of frames) {
          const line = frame.split('\n').find((part) => part.startsWith('data:'));
          if (!line) continue;
          const event = JSON.parse(line.slice(5).trim()) as { status?: string; completed?: number; total?: number; error?: string };
          if (event.error) throw new Error(event.error);
          onProgress(event);
        }
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * Probes Ollama running on localhost (browser-side) to discover installed models.
   */
  async probeLocalOllama(baseUrl = 'http://localhost:11434'): Promise<{ success: boolean; models: string[]; error?: string }> {
    try {
      const root = baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${root}/api/tags`);
      if (!res.ok) {
        return { success: false, models: [], error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const json = await res.json() as { models?: Array<{ name: string }> };
      const models = json.models?.map((m) => m.name) ?? [];
      return { success: true, models };
    } catch (err) {
      return {
        success: false,
        models: [],
        error: err instanceof Error ? err.message : 'Cannot reach local Ollama on ' + baseUrl,
      };
    }
  },
};
