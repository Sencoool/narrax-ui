import { useState, useEffect, useCallback, useMemo } from 'react';
import { novelService } from '../services/novelService';
import { characterService } from '../services/characterService';
import type { NovelContext, Character } from '../types/novel';
import type { CharacterBoard } from '../types/character';

export interface PinnedItem {
  type: 'character' | 'world' | 'plot' | 'style';
  label: string;
  content: string;
}

export interface UseNovelContextResult {
  context: NovelContext | null;
  characters: Character[];
  board: CharacterBoard | null;
  isLoading: boolean;
  pinnedItems: PinnedItem[];
  togglePin: (item: PinnedItem) => void;
  isPinned: (type: PinnedItem['type'], label: string) => boolean;
  buildPinnedContext: (episodeOrder?: number) => string;
  buildEpisodeCastContext: (cast: string[], editorText?: string, episodeOrder?: number) => string;
}

export function useNovelContext(novelId: string): UseNovelContextResult {
  const [context, setContext] = useState<NovelContext | null>(null);
  const [board, setBoard] = useState<CharacterBoard | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(novelId));
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);

  // Fetch on mount and whenever the novel changes. State is written from the
  // promise callbacks (never synchronously in the effect body) so mounting does
  // not cascade an extra render; `cancelled` drops responses for a stale novel.
  useEffect(() => {
    if (!novelId) return;

    let cancelled = false;

    Promise.allSettled([
      novelService.getContext(novelId),
      characterService.getBoard(novelId),
    ])
      .then(([contextResult, boardResult]) => {
        if (cancelled) return;
        setContext(contextResult.status === 'fulfilled' ? contextResult.value : null);
        setBoard(boardResult.status === 'fulfilled' ? boardResult.value : null);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [novelId]);

  // Parse characters (the API may return them as a JSON string). Memoised so the
  // array identity is stable — buildEpisodeCastContext is keyed on it, and a new
  // array every render would rebuild the AI context on every keystroke.
  const characters = useMemo<Character[]>(() => {
    if (board?.characters.length) {
      return board.characters.map((character) => ({
        name: character.name,
        description: character.description ?? undefined,
        imageUrl: character.imageUrl,
        role: (['protagonist', 'antagonist', 'supporting'] as const).find((role) => role === character.role) ?? 'other',
      }));
    }
    if (!context?.characters) return [];
    if (typeof context.characters === 'string') {
      try {
        return JSON.parse(context.characters as unknown as string) as Character[];
      } catch {
        return [];
      }
    }
    return context.characters;
  }, [board, context]);

  const togglePin = useCallback((item: PinnedItem) => {
    setPinnedItems((prev) => {
      const exists = prev.some((p) => p.type === item.type && p.label === item.label);
      if (exists) return prev.filter((p) => !(p.type === item.type && p.label === item.label));
      return [...prev, item];
    });
  }, []);

  const isPinned = useCallback(
    (type: PinnedItem['type'], label: string) =>
      pinnedItems.some((p) => p.type === type && p.label === label),
    [pinnedItems],
  );

  const buildPinnedContext = useCallback((episodeOrder = 0): string => {
    if (pinnedItems.length === 0) return '';
    const lines = ['[pinned context]'];
    for (const item of pinnedItems) {
      if (item.type === 'character' && board?.characters.length) {
        const record = board.characters.find((character) => character.name === item.label);
        if (!record || (record.introducedAtOrder !== null && record.introducedAtOrder > episodeOrder)) continue;
      }
      lines.push(item.label + ': ' + item.content);
    }
    return lines.length > 1 ? lines.join('\n') : '';
  }, [board, pinnedItems]);

  /**
   * Build a context string containing only the characters in `cast`.
   *
   * Fallback behaviour (when cast is empty):
   *   1. Scan editorText for character name occurrences and auto-include matches.
   *   2. If editorText is empty too, include ALL characters (legacy behaviour).
   */
  const buildEpisodeCastContext = useCallback(
    (cast: string[], editorText?: string, episodeOrder = 0): string => {
      if (characters.length === 0) return '';

      let selected: Character[];

      if (cast.length > 0) {
        // Explicit cast — only include chosen characters
        const castSet = new Set(cast.map((n) => n.toLowerCase()));
        selected = characters.filter((c) => castSet.has(c.name.toLowerCase()));
      } else if (editorText && editorText.trim().length > 0) {
        // Auto-detect: include characters whose name appears in the episode text
        const lowerText = editorText.toLowerCase();
        selected = characters.filter((c) => lowerText.includes(c.name.toLowerCase()));
      } else {
        // No cast, no text — include all characters
        selected = characters;
      }

      if (board?.characters.length) {
        selected = selected.filter((character) => {
          const record = board.characters.find((row) => row.name === character.name);
          return record && (record.introducedAtOrder === null || record.introducedAtOrder <= episodeOrder);
        });
      }

      if (selected.length === 0) return '';

      const lines = ['[Episode Characters]'];
      for (const char of selected) {
        const desc = char.description ? ': ' + char.description : '';
        lines.push('- ' + char.name + (char.role ? ' (' + char.role + ')' : '') + desc);
      }
      return lines.join('\n');
    },
    [board, characters],
  );

  return {
    context,
    characters,
    board,
    isLoading,
    pinnedItems,
    togglePin,
    isPinned,
    buildPinnedContext,
    buildEpisodeCastContext,
  };
}
