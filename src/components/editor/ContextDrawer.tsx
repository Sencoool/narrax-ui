import { useEffect, useRef } from 'react';
import { X, Pin, PinOff, User, Globe, FileText, Pen, ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { UseNovelContextResult, PinnedItem } from '../../hooks/useNovelContext';
import type { Character } from '../../types/novel';
import { CharacterAvatar } from '../characters/CharacterAvatar';

interface ContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  novelContext: UseNovelContextResult;
}

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'var(--color-blue-600)',
  antagonist: 'var(--color-danger)',
  supporting: 'var(--color-violet-600)',
  other: 'var(--color-text-muted)',
};

const ROLE_LABELS: Record<string, string> = {
  protagonist: 'ตัวเอก',
  antagonist: 'ผู้ร้าย',
  supporting: 'สมทบ',
  other: 'อื่นๆ',
};

function SectionHeader({
  icon, title, isOpen, onToggle, pinCount,
}: {
  icon: React.ReactNode; title: string; isOpen: boolean; onToggle: () => void; pinCount?: number;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
        padding: '0.75rem 0', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: isOpen ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span style={{ color: 'var(--color-violet-500)', display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'left' }}>{title}</span>
      {pinCount !== undefined && pinCount > 0 && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-violet-600)', background: 'var(--color-violet-50)', border: '1px solid var(--color-violet-200)', borderRadius: '9999px', padding: '0 0.4rem', lineHeight: '1.4rem' }}>
          {pinCount} ปักหมุด
        </span>
      )}
      {isOpen ? <ChevronDown size={13} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronRight size={13} style={{ color: 'var(--color-text-muted)' }} />}
    </button>
  );
}

function PinButton({ pinned, onClick }: { pinned: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุดไปยัง AI Context'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '22px', height: '22px', borderRadius: '4px', border: 'none',
        cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
        background: pinned ? 'var(--color-violet-100)' : 'transparent',
        color: pinned ? 'var(--color-violet-600)' : 'var(--color-text-muted)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-violet-50)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-violet-600)'; }}
      onMouseLeave={(e) => { if (!pinned) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; } }}
    >
      {pinned ? <Pin size={11} /> : <PinOff size={11} />}
    </button>
  );
}

export function ContextDrawer({ isOpen, onClose, novelContext }: ContextDrawerProps) {
  const { context, characters, board, isLoading, isPinned, togglePin, pinnedItems } = novelContext;
  const drawerRef = useRef<HTMLDivElement>(null);

  const [charsOpen, setCharsOpen] = useState(true);
  const [worldOpen, setWorldOpen] = useState(false);
  const [plotOpen, setPlotOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Character pin helper
  const handleCharPin = (char: Character) => {
    const item: PinnedItem = {
      type: 'character',
      label: char.name,
      content: `${char.name} (${ROLE_LABELS[char.role] ?? char.role})${char.description ? ': ' + char.description : ''}`,
    };
    togglePin(item);
  };

  const charPinCount = pinnedItems.filter((p) => p.type === 'character').length;
  const worldPinCount = pinnedItems.filter((p) => p.type === 'world').length;
  const plotPinCount = pinnedItems.filter((p) => p.type === 'plot').length;
  const stylePinCount = pinnedItems.filter((p) => p.type === 'style').length;

  const section = (type: PinnedItem['type'], content: string | null | undefined, label: string): PinnedItem => ({
    type, label, content: content ?? '',
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            backgroundColor: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Novel Context"
        style={{
          position: 'fixed', left: 0, top: '64px',
          height: 'calc(100vh - 64px)', width: '320px', zIndex: 1000,
          backgroundColor: 'var(--color-bg-elevated)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '1rem', borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--color-violet-600), var(--color-blue-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={13} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>บริบทเรื่อง</div>
            {pinnedItems.length > 0 && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-violet-600)', marginTop: '2px' }}>
                📌 {pinnedItems.length} รายการส่งไปยัง AI
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close context drawer"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '4px', borderRadius: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> กำลังโหลด…
            </div>
          ) : (
            <>
              {/* Characters */}
              <SectionHeader icon={<User size={13} />} title="ตัวละคร" isOpen={charsOpen} onToggle={() => setCharsOpen((v) => !v)} pinCount={charPinCount} />
              {charsOpen && (
                <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {characters.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>ยังไม่มีตัวละคร เพิ่มได้ที่หน้า Novel Settings</p>
                  ) : characters.map((char, i) => {
                    const pinned = isPinned('character', char.name);
                    const record = board?.characters.find((item) => item.name === char.name);
                    const factionNames = record?.factionIds
                      .map((id) => board?.factions.find((faction) => faction.id === id)?.name)
                      .filter((name): name is string => !!name) ?? [];
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                        padding: '0.625rem', borderRadius: 'var(--radius-md)',
                        backgroundColor: pinned ? 'var(--color-violet-50)' : 'var(--color-bg-subtle)',
                        border: '1px solid', borderColor: pinned ? 'var(--color-violet-200)' : 'var(--color-border)',
                        transition: 'all 0.15s',
                      }}>
                        {/* Avatar */}
                        <CharacterAvatar name={char.name} imageUrl={record?.imageUrl} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{char.name}</span>
                            <span style={{ fontSize: '0.6875rem', color: ROLE_COLORS[char.role], background: `${ROLE_COLORS[char.role]}18`, borderRadius: '9999px', padding: '0 0.375rem', lineHeight: '1.4rem' }}>
                              {ROLE_LABELS[char.role] ?? char.role}
                            </span>
                          </div>
                          {char.description && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                              {char.description}
                            </p>
                          )}
                          {factionNames.length > 0 && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                              {factionNames.join(' · ')}
                            </p>
                          )}
                        </div>
                        <PinButton pinned={pinned} onClick={() => handleCharPin(char)} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* World Building */}
              <SectionHeader icon={<Globe size={13} />} title="การสร้างโลก" isOpen={worldOpen} onToggle={() => setWorldOpen((v) => !v)} pinCount={worldPinCount} />
              {worldOpen && (
                <div style={{ marginBottom: '0.75rem' }}>
                  {!context?.worldBuilding ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>ยังไม่มีข้อมูลโลกในเรื่อง</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <p style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, padding: '0.5rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', borderColor: isPinned('world', 'โลกในเรื่อง') ? 'var(--color-violet-200)' : 'var(--color-border)' }}>
                        {context.worldBuilding}
                      </p>
                      <PinButton pinned={isPinned('world', 'โลกในเรื่อง')} onClick={() => togglePin(section('world', context.worldBuilding, 'โลกในเรื่อง'))} />
                    </div>
                  )}
                </div>
              )}

              {/* Plot Outline */}
              <SectionHeader icon={<FileText size={13} />} title="โครงเรื่อง" isOpen={plotOpen} onToggle={() => setPlotOpen((v) => !v)} pinCount={plotPinCount} />
              {plotOpen && (
                <div style={{ marginBottom: '0.75rem' }}>
                  {!context?.plotOutline ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>ยังไม่มีโครงเรื่อง</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <p style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, padding: '0.5rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: isPinned('plot', 'โครงเรื่อง') ? 'var(--color-violet-200)' : 'var(--color-border)' }}>
                        {context.plotOutline}
                      </p>
                      <PinButton pinned={isPinned('plot', 'โครงเรื่อง')} onClick={() => togglePin(section('plot', context.plotOutline, 'โครงเรื่อง'))} />
                    </div>
                  )}
                </div>
              )}

              {/* Writing Style */}
              <SectionHeader icon={<Pen size={13} />} title="สไตล์การเขียน" isOpen={styleOpen} onToggle={() => setStyleOpen((v) => !v)} pinCount={stylePinCount} />
              {styleOpen && (
                <div style={{ marginBottom: '0.75rem' }}>
                  {!context?.writingStyle ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>ยังไม่มีข้อมูลสไตล์การเขียน</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <p style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, padding: '0.5rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: isPinned('style', 'สไตล์การเขียน') ? 'var(--color-violet-200)' : 'var(--color-border)' }}>
                        {context.writingStyle}
                      </p>
                      <PinButton pinned={isPinned('style', 'สไตล์การเขียน')} onClick={() => togglePin(section('style', context.writingStyle, 'สไตล์การเขียน'))} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
