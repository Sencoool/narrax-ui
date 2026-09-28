import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CharacterBoard } from '../components/characters/CharacterBoard';
import { CharacterEditorModal } from '../components/characters/CharacterEditorModal';
import { FactionEditorModal } from '../components/characters/FactionEditorModal';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { characterService } from '../services/characterService';
import { episodeService } from '../services/episodeService';
import { novelService } from '../services/novelService';
import type {
  CharacterBoard as BoardData,
  CharacterRecord,
  FactionRecord,
  SaveCharacterDto,
  SaveFactionDto,
} from '../types/character';
import { getErrorMessage } from '../utils/errors';

export default function CharacterBoardPage() {
  const { id: novelId = '' } = useParams<{ id: string }>();
  const [state, setState] = useState<{
    board: BoardData;
    title: string;
    latestEpisodeOrder: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRecord | null | undefined>(undefined);
  const [selectedFaction, setSelectedFaction] = useState<FactionRecord | null | undefined>(undefined);

  const refreshBoard = async () => {
    const board = await characterService.getBoard(novelId);
    setState((current) => current ? { ...current, board } : current);
  };

  const saveCharacter = async (input: SaveCharacterDto) => {
    const character = await characterService.saveCharacter(novelId, input);
    await refreshBoard();
    return character;
  };

  const uploadImage = async (characterId: string, file: File) => {
    await characterService.uploadImage(novelId, characterId, file);
    await refreshBoard();
  };

  const deleteCharacter = async (id: string) => {
    await characterService.deleteCharacter(novelId, id);
    await refreshBoard();
  };

  const saveFaction = async (input: SaveFactionDto) => {
    await characterService.saveFaction(novelId, input);
    await refreshBoard();
  };

  const deleteFaction = async (id: string) => {
    await characterService.deleteFaction(novelId, id);
    await refreshBoard();
  };

  useEffect(() => {
    let canceled = false;
    Promise.all([
      characterService.getBoard(novelId),
      episodeService.getAllForNovel(novelId),
      novelService.getOne(novelId),
    ])
      .then(([board, episodes, novel]) => {
        if (!canceled) {
          setState({
            board,
            title: novel.title,
            latestEpisodeOrder: Math.max(0, ...episodes.map((episode) => episode.order)),
          });
        }
      })
      .catch((cause: unknown) => {
        if (!canceled) setError(getErrorMessage(cause, 'Could not load the character board'));
      });
    return () => { canceled = true; };
  }, [novelId]);

  return (
    <div className="page-container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <Link to={`/writer/novel/${novelId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        <ArrowLeft size={14} /> Back to Novel
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
        Character Board
      </h1>
      {state && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{state.title}</p>}
      {state && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <Button size="sm" onClick={() => setSelectedCharacter(null)}>Add character</Button>
          <Button size="sm" variant="secondary" onClick={() => setSelectedFaction(null)}>Add faction</Button>
        </div>
      )}
      {error && <p role="alert" style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</p>}
      {!state && !error && <div style={{ padding: '3rem', textAlign: 'center' }}><Spinner size={32} /></div>}
      {state && (
        <CharacterBoard
          board={state.board}
          latestEpisodeOrder={state.latestEpisodeOrder}
          onEditCharacter={setSelectedCharacter}
          onEditFaction={setSelectedFaction}
        />
      )}
      {state && selectedCharacter !== undefined && (
        <CharacterEditorModal
          key={selectedCharacter?.id ?? 'new'}
          character={selectedCharacter}
          factions={state.board.factions}
          onClose={() => setSelectedCharacter(undefined)}
          onSave={saveCharacter}
          onDelete={deleteCharacter}
          onUpload={uploadImage}
        />
      )}
      {state && selectedFaction !== undefined && (
        <FactionEditorModal
          key={selectedFaction?.id ?? 'new'}
          faction={selectedFaction}
          onClose={() => setSelectedFaction(undefined)}
          onSave={saveFaction}
          onDelete={deleteFaction}
        />
      )}
    </div>
  );
}
