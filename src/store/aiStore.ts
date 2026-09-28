import { create } from 'zustand';
import type { ChatMessage, ConversationTurn } from '../types/ai';

interface AiStore {
  draft: string;
  setDraft: (draft: string) => void;
  // Panel visibility
  isPanelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Settings
  temperature: number;
  setTemperature: (temp: number) => void;
  targetChars: number;
  setTargetChars: (chars: number) => void;

  // Aggregate status (reflects the last assistant message)
  status: 'idle' | 'generating' | 'streaming' | 'done' | 'error';

  // Conversation thread
  messages: ChatMessage[];

  // Streaming state — tracks the message being built right now
  streamingMessageId: string | null;

  // Actions
  addUserMessage: (text: string) => ChatMessage;
  startAssistantMessage: () => ChatMessage;
  appendToStreaming: (chunk: string) => void;
  setMessageStatus: (id: string, status: ChatMessage['status']) => void;
  setMessageError: (id: string) => void;
  setGenerationId: (messageId: string, generationId: string) => void;
  clearConversation: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultState = {
  draft: '',
  isPanelOpen: false,
  temperature: 0.6,
  targetChars: 2500,
  status: 'idle' as const,
  messages: [] as ChatMessage[],
  streamingMessageId: null as string | null,
};

export const useAiStore = create<AiStore>((set, get) => ({
  ...defaultState,
  setDraft: (draft) => set({ draft }),

  // ── Panel ──────────────────────────────────────────────────────────────────
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  // ── Settings ───────────────────────────────────────────────────────────────
  setTemperature: (temperature) => set({ temperature }),
  setTargetChars: (targetChars) => set({ targetChars }),

  // ── Conversation actions ───────────────────────────────────────────────────

  addUserMessage: (text: string) => {
    const msg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      status: 'done',
      timestamp: new Date(),
    };
    set((s) => ({ messages: [...s.messages, msg], status: 'generating' }));
    return msg;
  },

  startAssistantMessage: () => {
    const msg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: new Date(),
    };
    set((s) => ({
      messages: [...s.messages, msg],
      streamingMessageId: msg.id,
      status: 'streaming',
    }));
    return msg;
  },

  appendToStreaming: (chunk: string) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === streamingMessageId
          ? { ...m, content: m.content + chunk }
          : m,
      ),
    }));
  },

  setMessageStatus: (id: string, status: ChatMessage['status']) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, status } : m)),
      // Update aggregate status when the last message finishes
      status:
        status === 'done' || status === 'accepted' || status === 'rejected'
          ? 'idle'
          : status === 'error'
          ? 'error'
          : s.status,
      streamingMessageId:
        status !== 'streaming' ? null : s.streamingMessageId,
    }));
  },

  setMessageError: (id: string) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, status: 'error' } : m,
      ),
      status: 'error',
      streamingMessageId: null,
    }));
  },

  setGenerationId: (messageId, generationId) => set((state) => ({
    messages: state.messages.map((message) => message.id === messageId ? { ...message, generationId } : message),
  })),

  clearConversation: () =>
    set({ messages: [], status: 'idle', streamingMessageId: null }),
}));

// ─── Selector helpers ─────────────────────────────────────────────────────────

/**
 * Maximum turns a single generation request may carry. Mirrors
 * `conversationHistory.max(20)` in the API's StreamGenerationDto — sending more
 * makes POST /story-generations/stream fail with a 400.
 */
const MAX_HISTORY_TURNS = 20;

/** Build a ConversationTurn[] from the message thread (for the API payload). */
export function buildConversationHistory(messages: ChatMessage[]): ConversationTurn[] {
  return messages
    .filter((m) => m.status !== 'error') // skip failed messages
    .slice(-MAX_HISTORY_TURNS) // keep only the most recent turns
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 6000), // enforce API limit per turn
    }));
}
