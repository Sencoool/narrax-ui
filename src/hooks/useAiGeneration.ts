import { useRef, useCallback, useEffect } from 'react';
import { streamStoryGeneration } from '../services/aiService';
import { useAiStore, buildConversationHistory } from '../store/aiStore';
import { useUiStore } from '../store/uiStore';
import type { StreamGenerationRequest } from '../types/ai';

/**
 * Hook that orchestrates the AI generation flow.
 * - Adds user and assistant messages to the conversation thread.
 * - Streams tokens into the latest assistant message.
 * - Sends full conversation history to the backend for multi-turn context.
 *
 * @param novelId - Current novel UUID
 * @param episodeId - Current episode UUID (optional)
 * @param getEditorContent - Function to get current editor HTML content
 */
export function useAiGeneration(
  novelId: string,
  episodeId: string | undefined,
  getEditorContent: () => string,
  buildPinnedContext?: () => string,
) {
  const abortControllerRef = useRef<AbortController | null>(null);

  // The context builder is recreated on every parent render (it closes over the
  // pinned items and the editor), so read it through a ref instead of capturing
  // it in generate() — otherwise a generation started right after pinning a
  // character could send the previously built context.
  const buildPinnedContextRef = useRef(buildPinnedContext);
  useEffect(() => {
    buildPinnedContextRef.current = buildPinnedContext;
  });

  const {
    temperature,
    messages,
    addUserMessage,
    startAssistantMessage,
    appendToStreaming,
    setMessageStatus,
    setMessageError,
    setGenerationId,
  } = useAiStore();

  const { addToast } = useUiStore();

  const generate = useCallback(async (promptText: string) => {
    if (!novelId) {
      addToast({ type: 'error', title: 'Generation blocked', message: 'novelId is missing' });
      return;
    }
    if (!promptText.trim()) {
      addToast({ type: 'error', title: 'Generation blocked', message: 'Prompt is empty' });
      return;
    }

    let currentContent: string;
    try {
      currentContent = getEditorContent();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast({ type: 'error', title: 'Failed to get editor content', message });
      return;
    }

    // Abort any ongoing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // 0. Prepend pinned context if any
    const pinnedCtx = buildPinnedContextRef.current?.();
    const fullPrompt = pinnedCtx ? `${pinnedCtx}\n\n${promptText.trim()}` : promptText.trim();

    // 1. Add the user message to thread
    addUserMessage(promptText.trim());

    // 2. Build conversation history from existing messages (BEFORE adding assistant turn)
    const conversationHistory = buildConversationHistory(messages);

    // 3. Start assistant message bubble (streaming)
    const assistantMsg = startAssistantMessage();

    // 4. Build API request
    const request: StreamGenerationRequest = {
      novelId,
      ...(episodeId ? { episodeId } : {}),
      userMessage: fullPrompt,
      currentContent: currentContent || undefined,
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      temperature,
    };

    try {
      await streamStoryGeneration(
        request,
        (event) => {
          switch (event.type) {
            case 'chunk':
              appendToStreaming(event.text);
              break;
            case 'segment_start':
              // Progress — future segment indicator
              break;
            case 'segment_done':
              break;
            case 'done':
              setGenerationId(assistantMsg.id, event.requestId);
              setMessageStatus(assistantMsg.id, 'done');
              break;
            case 'error':
              setMessageError(assistantMsg.id);
              addToast({ type: 'error', title: 'AI Generation Failed', message: event.message });
              break;
          }
        },
        abortControllerRef.current.signal,
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setMessageStatus(assistantMsg.id, 'done'); // treat cancel as done
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessageError(assistantMsg.id);
      addToast({ type: 'error', title: 'AI Generation Failed', message });
    }
  }, [
    novelId,
    episodeId,
    temperature,
    messages,
    getEditorContent,
    addUserMessage,
    startAssistantMessage,
    appendToStreaming,
    setMessageStatus,
    setMessageError,
    setGenerationId,
    addToast,
  ]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { generate, cancel };
}
