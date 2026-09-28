import { useMemo, useState } from 'react';
import type { CharacterBoard as BoardData, CharacterRecord, FactionRecord } from '../../types/character';
import { CharacterCard } from './CharacterCard';

interface CharacterBoardProps {
  board: BoardData;
  latestEpisodeOrder: number;
  onEditCharacter?: (character: CharacterRecord) => void;
  onEditFaction?: (faction: FactionRecord) => void;
}

function BoardColumn({ title, color, characters, onEditCharacter, onEditFaction }: {
  title: string;
  color?: string | null;
  characters: CharacterRecord[];
  onEditCharacter?: (character: CharacterRecord) => void;
  onEditFaction?: () => void;
}) {
  return (
    <section
      className="card"
      style={{ minWidth: 240, flex: '1 1 240px', padding: '1rem', alignSelf: 'start' }}
    >
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: color ?? 'var(--color-text-primary)', marginBottom: '1rem' }}>
        {onEditFaction ? <button type="button" onClick={onEditFaction} style={{ color: 'inherit', fontWeight: 'inherit' }}>{title}</button> : title}{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>({characters.length})</span>
      </h2>
      <div style={{ display: 'grid', gap: '0.625rem' }}>
        {characters.length ? characters.map((character) => (
          <CharacterCard key={character.id} character={character} onEdit={onEditCharacter} />
        )) : <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>ยังไม่มีตัวละคร</p>}
      </div>
    </section>
  );
}

export function CharacterBoard({ board, latestEpisodeOrder, onEditCharacter, onEditFaction }: CharacterBoardProps) {
  const [arc, setArc] = useState('');
  const [showFuture, setShowFuture] = useState(false);
  const arcs = useMemo(
    () => [...new Set(board.factions.map((faction) => faction.arcLabel).filter((value): value is string => !!value))],
    [board.factions],
  );
  const visible = board.characters.filter(
    (character) => showFuture || character.introducedAtOrder === null || character.introducedAtOrder <= latestEpisodeOrder,
  );
  const factions: FactionRecord[] = arc
    ? board.factions.filter((faction) => faction.arcLabel === arc)
    : board.factions;
  const unassigned = visible.filter((character) => character.factionIds.length === 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Season / arc{' '}
          <select aria-label="Season or arc" value={arc} onChange={(event) => setArc(event.target.value)}>
            <option value="">ทั้งหมด</option>
            {arcs.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          <input type="checkbox" checked={showFuture} onChange={(event) => setShowFuture(event.target.checked)} />
          แสดงตัวละครที่ยังไม่ปรากฏ
        </label>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: '1rem' }}>
        <BoardColumn title="ยังไม่สังกัดฝ่าย" characters={unassigned} onEditCharacter={onEditCharacter} />
        {factions.map((faction) => (
          <BoardColumn
            key={faction.id}
            title={faction.name}
            color={faction.color}
            characters={visible.filter((character) => character.factionIds.includes(faction.id))}
            onEditCharacter={onEditCharacter}
            onEditFaction={() => onEditFaction?.(faction)}
          />
        ))}
      </div>
    </>
  );
}
