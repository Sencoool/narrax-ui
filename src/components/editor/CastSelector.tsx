import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Users, Search, X, Sparkles } from 'lucide-react';
import type { Character } from '../../types/novel';
import { CharacterAvatar } from '../characters/CharacterAvatar';

interface CastSelectorProps {
  characters: Character[];
  cast: string[];
  onCastChange: (cast: string[]) => void;
}

export function CastSelector({ characters, cast, onCastChange }: CastSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Auto-focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const openWithFreshSearch = useCallback(() => {
    setIsOpen((open) => !open);
    setSearch('');
  }, []);

  // Keyboard: Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const castSet = useMemo(() => new Set(cast), [cast]);

  const toggle = useCallback(
    (name: string) => {
      const next = castSet.has(name)
        ? cast.filter((n) => n !== name)
        : [...cast, name];
      onCastChange(next);
    },
    [cast, castSet, onCastChange],
  );

  const remove = useCallback(
    (name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onCastChange(cast.filter((n) => n !== name));
    },
    [cast, onCastChange],
  );

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return characters.filter((c) => !castSet.has(c.name) && c.name.toLowerCase().includes(q));
  }, [characters, castSet, search]);

  const selectedCharacters = useMemo(
    () => characters.filter((c) => castSet.has(c.name)),
    [characters, castSet],
  );

  // Collapsed label
  const triggerLabel = (() => {
    if (cast.length === 0) return 'Cast (auto)';
    if (cast.length <= 2) return cast.join(', ');
    return cast.slice(0, 2).join(', ') + ' +' + (cast.length - 2);
  })();

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* ── Trigger button ── */}
      <button
        id="cast-selector-trigger"
        onClick={openWithFreshSearch}
        title="Manage episode cast — control which characters the AI knows about"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.375rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          backgroundColor: cast.length > 0 ? 'rgba(99,102,241,0.08)' : 'transparent',
          color: cast.length > 0 ? '#6366f1' : 'var(--color-text-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          maxWidth: 180,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <Users size={13} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{triggerLabel}</span>
        <span style={{ opacity: 0.5, marginLeft: 2 }}>▾</span>
      </button>

      {/* ── Popover ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 200,
            width: 280,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 0.75rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <Search size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Selected chips */}
          {selectedCharacters.length > 0 && (
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selected ({selectedCharacters.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {selectedCharacters.map((c) => (
                  <span
                    key={c.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(99,102,241,0.12)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      fontSize: '0.75rem',
                      color: '#6366f1',
                      fontWeight: 500,
                    }}
                  >
                    {c.name}
                    <button
                      onClick={(e) => remove(c.name, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex', alignItems: 'center' }}
                      aria-label={"Remove " + c.name + " from cast"}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Character list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length > 0 ? (
              <>
                {selectedCharacters.length > 0 && (
                  <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', padding: '0.5rem 0.75rem 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    All Characters ({filtered.length} more)
                  </p>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => toggle(c.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.8125rem',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <CharacterAvatar name={c.name} imageUrl={c.imageUrl} size={20} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                      {c.role && <span style={{ color: 'var(--color-text-muted)', marginLeft: 4, fontSize: '0.75rem' }}>· {c.role}</span>}
                    </span>
                  </button>
                ))}
              </>
            ) : search ? (
              <p style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                No characters match "{search}"
              </p>
            ) : selectedCharacters.length === characters.length && characters.length > 0 ? (
              <p style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                All characters selected
              </p>
            ) : null}
          </div>

          {/* Auto-detect footer */}
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.5rem 0.75rem' }}>
            <button
              onClick={() => onCastChange([])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                width: '100%',
                padding: '0.375rem 0.5rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: cast.length === 0 ? 'rgba(99,102,241,0.08)' : 'none',
                color: cast.length === 0 ? '#6366f1' : 'var(--color-text-muted)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => { if (cast.length > 0) e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
              onMouseLeave={(e) => { if (cast.length > 0) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Sparkles size={13} />
              Auto-detect from episode text
              {cast.length === 0 && <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', fontWeight: 600 }}>Active</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
