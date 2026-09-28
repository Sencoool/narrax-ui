import type { CharacterRecord } from '../../types/character';
import { CharacterAvatar } from './CharacterAvatar';

const ROLE_LABELS: Record<string, string> = {
  protagonist: 'ตัวเอก',
  antagonist: 'ตัวร้าย',
  supporting: 'ตัวประกอบ',
  other: 'อื่น ๆ',
};

export function CharacterCard({ character, onEdit }: { character: CharacterRecord; onEdit?: (character: CharacterRecord) => void }) {
  return (
    <button type="button" onClick={() => onEdit?.(character)} className="card" style={{ padding: '0.875rem', display: 'flex', gap: '0.75rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
      <CharacterAvatar name={character.name} imageUrl={character.imageUrl} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>{character.name}</strong>
          {character.factionIds.length > 1 && (
            <span title="Appears in multiple factions" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              ×{character.factionIds.length}
            </span>
          )}
        </div>
        {character.role && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {ROLE_LABELS[character.role] ?? character.role}
          </div>
        )}
        {character.introducedAtOrder !== null && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            ปรากฏตอนที่ {character.introducedAtOrder}
          </div>
        )}
      </div>
    </button>
  );
}
