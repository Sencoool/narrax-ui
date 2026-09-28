export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'ollama'
  | 'custom';

export interface UserModelConfig {
  id: string;
  userId: string;
  label: string;
  provider: ModelProvider;
  modelName: string;
  maskedApiKey: string;
  baseUrl: string | null;
  isDefault: boolean;
  contextTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserModelDto {
  label: string;
  provider: ModelProvider;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  isDefault?: boolean;
  contextTokens?: number;
}

export interface UpdateUserModelDto {
  label?: string;
  provider?: ModelProvider;
  modelName?: string;
  apiKey?: string;
  baseUrl?: string;
  isDefault?: boolean;
  contextTokens?: number;
}

export interface TestModelDto {
  id?: string;
  provider?: ModelProvider;
  modelName?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface TestModelResponse {
  success: boolean;
  latencyMs: number;
  message?: string;
  error?: string;
}
