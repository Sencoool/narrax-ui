import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import type { SelectOption } from '../ui/Select';
import { Modal } from '../ui/Modal';
import type { Character } from '../../types/novel';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'protagonist', label: 'Protagonist', color: '#3b82f6' },
  { value: 'antagonist',  label: 'Antagonist',  color: '#ef4444' },
  { value: 'supporting',  label: 'Supporting',  color: '#f59e0b' },
  { value: 'other',       label: 'Other',       color: '#94a3b8' },
];

interface NovelContextPanelProps {
  plotOutline: string;
  writingStyle: string;
  worldSetting: string;
  characters: Character[];
  onPlotOutlineChange: (v: string) => void;
  onWritingStyleChange: (v: string) => void;
  onWorldSettingChange: (v: string) => void;
  onCharactersChange: (chars: Character[]) => void;
  onSave: () => void;
  isSaving?: boolean;
  defaultOpen?: boolean;
  manageCharactersUrl?: string;
}

export function NovelContextPanel({
  plotOutline,
  writingStyle,
  worldSetting,
  characters,
  onPlotOutlineChange,
  onWritingStyleChange,
  onWorldSettingChange,
  onCharactersChange,
  onSave,
  isSaving = false,
  defaultOpen = false,
  manageCharactersUrl,
}: NovelContextPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [descModal, setDescModal] = useState<{ index: number; value: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const addCharacter = () =>
    onCharactersChange([...characters, { name: '', role: 'other', description: '' }]);

  const removeCharacter = (i: number) =>
    onCharactersChange(characters.filter((_, j) => j !== i));

  const updateCharacter = (i: number, patch: Partial<Character>) => {
    const updated = [...characters];
    updated[i] = { ...updated[i], ...patch };
    onCharactersChange(updated);
  };

  const openDescModal = (i: number) =>
    setDescModal({ index: i, value: characters[i].description ?? '' });

  const saveDescModal = () => {
    if (descModal === null) return;
    updateCharacter(descModal.index, { description: descModal.value });
    setDescModal(null);
  };

  const charName = (i: number) => characters[i]?.name?.trim() || `Character ${i + 1}`;

  return (
    <>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {/* Toggle header */}
        <button
          onClick={() => setOpen((o) => !o)}
          id="lore-toggle"
          aria-expanded={open}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '1.25rem 2rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-primary)',
            fontWeight: 700,
            fontSize: '1rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🧠 AI Story Context
            <Badge variant="purple">Used by AI when writing</Badge>
          </span>
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {open && (
          <div
            style={{
              padding: '0 2rem 2rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
              This context is used by the AI when generating content. The more detail you provide, the better the AI understands your world.
            </p>

            <Textarea
              label="Plot Outline (Preferred language is recommended)"
              id="lore-plot"
              value={plotOutline}
              onChange={(e) => onPlotOutlineChange(e.target.value)}
              placeholder="Main story arc, key events, turning points…"
              rows={4}
              hint="Max 5,000 characters"
            />

            <Textarea
              label="Writing Style (English is recommended)"
              id="lore-style"
              value={writingStyle}
              onChange={(e) => onWritingStyleChange(e.target.value)}
              placeholder="E.g., third-person omniscient, literary fiction, dark and suspenseful…"
              rows={3}
              hint="Max 1,000 characters"
            />

            <Textarea
              label="World Settings (Preferred language is recommended)"
              id="lore-world-setting"
              value={worldSetting}
              onChange={(e) => onWorldSettingChange(e.target.value)}
              placeholder="E.g., third-person omniscient, literary fiction, dark and suspenseful…"
              rows={3}
              hint="Max 1,000 characters"
            />

            {/* Characters */}
            <div>
              {manageCharactersUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Characters and factions are managed on the board.</span>
                  <Link to={manageCharactersUrl} style={{ color: 'var(--color-blue-600)', fontWeight: 600 }}>
                    Open Character Board
                  </Link>
                </div>
              ) : (
                <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <label
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Characters (Preferred language is recommended)
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={addCharacter}
                  id="add-character-btn"
                >
                  Add Character
                </Button>
              </div>

              {characters.length === 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No characters defined yet. Add your main characters so the AI knows who they are.
                </p>
              )}

              {characters.map((char, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginBottom: '0.625rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <Input
                    placeholder="Name"
                    value={char.name}
                    onChange={(e) => updateCharacter(i, { name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <Select
                    options={ROLE_OPTIONS}
                    value={char.role}
                    onChange={(v) => updateCharacter(i, { role: v as Character['role'] })}
                    style={{ width: '140px', flexShrink: 0 }}
                  />
                  <button
                    id={`char-desc-btn-${i}`}
                    onClick={() => openDescModal(i)}
                    title={char.description || 'No description yet'}
                    style={{
                      flex: 2,
                      textAlign: 'left',
                      background: 'var(--color-bg-base, rgba(255,255,255,0.04))',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      color: char.description ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-3, rgba(255,255,255,0.07))';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2, rgba(255,255,255,0.04))';
                    }}
                  >
                    {char.description || 'Brief description…'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                    aria-label="Remove character"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="ai"
                onClick={onSave}
                loading={isSaving}
                id="save-lore-btn"
              >
                Save Context
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Description Modal — outside the card so overflow:hidden doesn't clip it */}
      {descModal !== null && (
        <div
          id="char-desc-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setDescModal(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.65)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            id="char-desc-modal"
            style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: '1rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '520px',
              margin: '0 1rem',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              animation: 'slideUp 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                ✏️ Description — {charName(descModal.index)}
              </h3>
              <button
                id="char-desc-modal-close"
                onClick={() => setDescModal(null)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  padding: '0.25rem',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Describe this character — personality, appearance, background, motivations, etc.
            </p>

            <textarea
              id="char-desc-modal-textarea"
              autoFocus
              value={descModal.value}
              onChange={(e) => setDescModal((prev) => prev ? { ...prev, value: e.target.value } : prev)}
              placeholder="E.g., A quiet, introspective woman in her 30s with sharp eyes and a troubled past…"
              rows={6}
              style={{
                width: '100%',
                resize: 'vertical',
                background: 'var(--color-surface-2, rgba(255,255,255,0.04))',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setDescModal(null)} id="char-desc-cancel-btn">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={saveDescModal} id="char-desc-save-btn">
                Save Description
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* Delete Character Confirm Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Character?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} id="delete-char-cancel">
              Cancel
            </Button>
            <Button
              variant="danger"
              id="delete-char-confirm"
              onClick={() => {
                if (deleteConfirm !== null) removeCharacter(deleteConfirm);
                setDeleteConfirm(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Remove{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>
            {deleteConfirm !== null ? (characters[deleteConfirm]?.name?.trim() || `Character ${deleteConfirm + 1}`) : ''}
          </strong>{' '}
          from the story context? This won't affect already-written content.
        </p>
      </Modal>
    </>
  );
}
