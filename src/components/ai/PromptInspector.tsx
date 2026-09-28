import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getGeneration, listEpisodeGenerations } from '../../services/aiService';
import type { GenerationDetail } from '../../types/ai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  generationId: string | null;
  episodeId?: string;
}

export function PromptInspector({ isOpen, onClose, generationId, episodeId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(generationId);
  const [history, setHistory] = useState<GenerationDetail[]>([]);
  const [record, setRecord] = useState<GenerationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !episodeId) return;
    let active = true;
    void listEpisodeGenerations(episodeId)
      .then((records) => { if (active) setHistory(records); })
      .catch(() => { if (active) setError('Could not load generation history.'); });
    return () => { active = false; };
  }, [isOpen, episodeId]);

  useEffect(() => {
    if (!isOpen || !selectedId) return;
    let active = true;
    void getGeneration(selectedId)
      .then((detail) => { if (active) { setRecord(detail); setError(null); } })
      .catch(() => { if (active) setError('Could not load this generation.'); });
    return () => { active = false; };
  }, [isOpen, selectedId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const currentRecord = record?.id === selectedId ? record : null;
  const snapshot = currentRecord?.contextSnapshot;
  return (
    <div role="presentation" onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end' }}>
      <section role="dialog" aria-label="Prompt Inspector" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} style={{ width: 'min(560px, 100vw)', height: '100%', overflowY: 'auto', padding: '1rem', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', boxShadow: 'var(--shadow-lg)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Prompt Inspector</h2>
          <button type="button" onClick={onClose} aria-label="Close prompt inspector" style={buttonStyle}><X size={16} /></button>
        </header>
        {history.length > 0 && <section style={{ marginTop: '1rem' }}>
          <h3 style={headingStyle}>Episode generations</h3>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {history.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setError(null); }} style={buttonStyle} aria-current={selectedId === item.id ? 'true' : undefined}>
              {new Date(item.createdAt).toLocaleString()} · {item.model ?? item.provider}
            </button>)}
          </div>
        </section>}
        {error && <p role="alert" style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
        {!currentRecord && !error && <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>{selectedId ? 'Loading…' : 'ยังไม่มีการสร้างให้ตรวจสอบ'}</p>}
        {currentRecord && <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <Block title="System prompt"><pre style={preStyle}>{currentRecord.systemPrompt ?? '—'}</pre></Block>
          <Block title="User prompt"><pre style={preStyle}>{currentRecord.prompt}</pre></Block>
          <Block title="Retrieved chunks">
            {snapshot?.chunks?.length ? snapshot.chunks.map((chunk, index) => <p key={index} style={lineStyle}>
              {chunk.episodeTitle ?? 'Episode'} · distance {chunk.distance.toFixed(3)}<br />{chunk.preview}
            </p>) : <p style={lineStyle}>No chunks retrieved.</p>}
          </Block>
          <Block title="History sent">
            <p style={lineStyle}>{snapshot?.history?.turnsSent ?? 0} turns</p>
            {snapshot?.history?.turns.map((turn, index) => <p key={index} style={lineStyle}>{turn.role}: {turn.preview}</p>)}
          </Block>
          <Block title="Parameters"><p style={lineStyle}>
            {currentRecord.provider} · {currentRecord.model ?? 'Unknown model'} · temperature {currentRecord.temperature ?? '—'} · target {snapshot?.targetChars ?? '—'} chars · duration {currentRecord.durationMs ?? '—'} ms · {currentRecord.status}
          </p></Block>
        </div>}
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 style={headingStyle}>{title}</h3><div style={{ padding: '0.75rem', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>{children}</div></section>;
}

const headingStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.375rem' };
const lineStyle: React.CSSProperties = { fontSize: '0.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };
const preStyle: React.CSSProperties = { ...lineStyle, fontFamily: 'monospace', margin: 0 };
const buttonStyle: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.75rem' };
