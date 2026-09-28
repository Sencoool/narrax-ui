export type GenerationStatus = 'idle' | 'generating' | 'streaming' | 'done' | 'error';

// ─── Chat Message Thread ─────────────────────────────────────────────────────

export type ChatMessageStatus = 'streaming' | 'done' | 'error' | 'accepted' | 'rejected';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: ChatMessageStatus;
  timestamp: Date;
  generationId?: string;
}

export interface GenerationDetail {
  id: string;
  createdAt: string;
  systemPrompt: string | null;
  prompt: string;
  provider: string;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  durationMs: number | null;
  status: string;
  contextSnapshot: {
    targetChars?: number;
    chunks?: { episodeTitle: string | null; distance: number; preview: string }[];
    history?: { turnsSent: number; turns: { role: string; preview: string }[] };
  } | null;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// ─── API Types ───────────────────────────────────────────────────────────────

/** POST /story-generations/stream request body */
export interface StreamGenerationRequest {
  novelId: string;
  episodeId?: string;
  userMessage: string;
  /** Current editor content (HTML) — used by the API as the story so far context */
  currentContent?: string;
  /** Prior conversation turns for multi-turn context */
  conversationHistory?: ConversationTurn[];
  /** Temperature controls creativity */
  temperature?: number;
}

/** SSE event types from the API */
export type SseEventType = 'chunk' | 'segment_start' | 'segment_done' | 'done' | 'error';

export interface SseChunkEvent {
  type: 'chunk';
  text: string;
}

export interface SseSegmentStartEvent {
  type: 'segment_start';
  segment: number;
  total: number;
}

export interface SseSegmentDoneEvent {
  type: 'segment_done';
  segment: number;
  chars: number;
}

export interface SseDoneEvent {
  type: 'done';
  requestId: string;
  totalChars: number;
}

export interface SseErrorEvent {
  type: 'error';
  message: string;
}

export type SseEvent =
  | SseChunkEvent
  | SseSegmentStartEvent
  | SseSegmentDoneEvent
  | SseDoneEvent
  | SseErrorEvent;

/** Diff token for Before/After view */
export interface DiffToken {
  text: string;
  type: 'equal' | 'insert' | 'delete';
}
