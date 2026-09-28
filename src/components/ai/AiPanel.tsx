import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Sparkles, X, Check, RotateCcw, AlertCircle, Trash2, Copy,
} from 'lucide-react';
import { useAiStore } from '../../store/aiStore';
import { useModelStore } from '../../store/modelStore';
import { useConversationPersistence } from '../../hooks/useConversationPersistence';
import { AiComposer } from './AiComposer';
import { PromptInspector } from './PromptInspector';
import type { Editor } from '@tiptap/react';
import type { ChatMessage } from '../../types/ai';

interface AiPanelProps {
  novelId: string;
  episodeId?: string;
  editor: Editor | null;
  buildPinnedContext?: () => string;
}

// ─── Per-message action helpers ───────────────────────────────────────────────

function formatTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function MessageBubble({
  msg,
  editor,
  onInspect,
}: {
  msg: ChatMessage;
  editor: Editor | null;
  onInspect?: (generationId: string) => void;
}) {
  const setMessageStatus = useAiStore((s) => s.setMessageStatus);
  const isStreaming = msg.status === 'streaming';
  const isUser = msg.role === 'user';
  const isDone = msg.status === 'done';
  const isAccepted = msg.status === 'accepted';
  const isRejected = msg.status === 'rejected';
  const isError = msg.status === 'error';

  const handleAccept = useCallback(() => {
    if (editor && msg.content) {
      const endPos = editor.state.doc.content.size;
      editor.commands.insertContentAt(endPos, formatTextToHtml(msg.content));
    }
    setMessageStatus(msg.id, 'accepted');
  }, [editor, msg.content, msg.id, setMessageStatus]);

  const handleReject = useCallback(() => {
    setMessageStatus(msg.id, 'rejected');
  }, [msg.id, setMessageStatus]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(msg.content);
  }, [msg.content]);

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth: '85%',
            padding: '0.625rem 0.875rem',
            borderRadius: '1rem 1rem 0.25rem 1rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  // ── Assistant bubble ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {/* Avatar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: isError
              ? 'rgba(239,68,68,0.15)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {isError
            ? <AlertCircle size={12} color="#ef4444" />
            : <Sparkles size={11} color="#fff" />}
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Writing Assistant
        </span>
        {isAccepted && (
          <span style={{
            fontSize: '0.6875rem', color: '#10b981', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Check size={11} /> Inserted
          </span>
        )}
        {isRejected && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Discarded
          </span>
        )}
      </div>

      {/* Content bubble */}
      <div
        style={{
          marginLeft: 30,
          padding: '0.75rem 1rem',
          borderRadius: '0.25rem 1rem 1rem 1rem',
          backgroundColor: isError
            ? 'rgba(239,68,68,0.06)'
            : (isAccepted || isRejected)
            ? 'var(--color-bg-subtle)'
            : 'var(--color-bg-elevated)',
          border: `1px solid ${isError ? 'rgba(239,68,68,0.25)' : 'var(--color-border)'}`,
          fontSize: '0.875rem',
          lineHeight: 1.75,
          color: isError
            ? '#ef4444'
            : (isAccepted || isRejected)
            ? 'var(--color-text-muted)'
            : 'var(--color-text-primary)',
          fontFamily: 'var(--font-serif)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          opacity: isRejected ? 0.5 : 1,
          position: 'relative',
        }}
        aria-live={isStreaming ? 'polite' : undefined}
      >
        {isError ? (
          <span>Generation failed. Please try again.</span>
        ) : (
          <>
            {msg.content}
            {isStreaming && (
              <span
                style={{
                  display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                  backgroundColor: '#6366f1', marginLeft: 4, verticalAlign: 'middle',
                  animation: 'ai-cursor-blink 1s ease-in-out infinite',
                }}
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>

      {/* Action row — only when done */}
      {isDone && (
        <div
          style={{
            marginLeft: 30, display: 'flex', gap: '0.375rem', paddingTop: '0.125rem',
          }}
        >
          <button
            onClick={handleAccept}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.625rem', borderRadius: 'var(--radius-full)',
              border: '1.5px solid #10b981', backgroundColor: 'rgba(16,185,129,0.08)',
              color: '#10b981', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.08)'; }}
          >
            <Check size={12} /> Insert
          </button>
          <button
            onClick={handleReject}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.625rem', borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--color-border)', backgroundColor: 'transparent',
              color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <RotateCcw size={11} /> Discard
          </button>
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              border: 'none', backgroundColor: 'transparent',
              color: 'var(--color-text-muted)', cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Copy size={13} />
          </button>
          {msg.generationId && onInspect && <button type="button" onClick={() => onInspect(msg.generationId!)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Inspect</button>}
        </div>
      )}
    </div>
  );
}

// ─── Thinking animation ───────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Sparkles size={11} color="#fff" />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Writing Assistant
        </span>
      </div>
      <div style={{
        marginLeft: 30, padding: '0.75rem 1rem',
        borderRadius: '0.25rem 1rem 1rem 1rem',
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
      }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: '#6366f1', display: 'inline-block',
              animation: `ai-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '0.75rem', padding: '2rem 1rem',
      textAlign: 'center', color: 'var(--color-text-muted)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={22} color="#6366f1" />
      </div>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        AI Writing Assistant
      </p>
      <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, maxWidth: 220 }}>
        พิมพ์คำสั่งด้านล่างเพื่อให้ AI ช่วยเขียนเนื้อเรื่อง หรือเขียนต่อจากตรงที่คุณค้างไว้
      </p>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AiPanel({ novelId, episodeId, editor, buildPinnedContext }: AiPanelProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const isPanelOpen = useAiStore((s) => s.isPanelOpen);
  const closePanel = useAiStore((s) => s.closePanel);
  const status = useAiStore((s) => s.status);
  const messages = useAiStore((s) => s.messages);
  const activeModel = useModelStore((s) => s.activeModel);

  const { clearAndPersist } = useConversationPersistence(episodeId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll within the panel's own scroll container — never scrolls the page
  useEffect(() => {
    if (status === 'streaming' || status === 'generating') {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, status]);

  if (!isPanelOpen) return null;

  const isRunning = status === 'generating' || status === 'streaming';
  const hasMessages = messages.length > 0;

  return (
    <div
      role="complementary"
      aria-label="AI Writing Assistant"
      style={{
        height: '100%', width: '100%',
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--color-bg-base)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0, gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              Writing Assistant
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>
              {isRunning ? (
                <span style={{ color: '#6366f1' }}>● Generating…</span>
              ) : activeModel ? (
                <span>{activeModel.label} ({activeModel.modelName})</span>
              ) : (
                <span style={{ color: '#eab308' }}>No model configured</span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {episodeId && <button type="button" onClick={() => { setInspectorId(null); setInspectorOpen(true); }} title="Generation history" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>History</button>}
          {/* Clear conversation */}
          {hasMessages && (
            <button
              onClick={clearAndPersist}
              title="Clear conversation"
              aria-label="Clear conversation"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, background: 'none', border: 'none',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                color: 'var(--color-text-muted)', transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <Trash2 size={14} />
            </button>
          )}
          {/* Close */}
          <button
            onClick={closePanel}
            aria-label="Close AI panel"
            id="ai-panel-close"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, background: 'none', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              color: 'var(--color-text-muted)', transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Message Thread ── */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        {!hasMessages && <EmptyState />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} editor={editor} onInspect={(id) => { setInspectorId(id); setInspectorOpen(true); }} />
        ))}

        {/* Thinking animation — shows before first chunk arrives */}
        {status === 'generating' && (
          <ThinkingBubble />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <AiComposer
            novelId={novelId}
            episodeId={episodeId}
            editor={editor}
            buildPinnedContext={buildPinnedContext}
          />

      {inspectorOpen && <PromptInspector key={`${inspectorId ?? 'history'}:${episodeId ?? ''}`} isOpen onClose={() => setInspectorOpen(false)} generationId={inspectorId} episodeId={episodeId} />}

      <style>{`
        @keyframes ai-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ai-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
