import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import type { FactionRecord, SaveFactionDto } from '../../types/character';
import { getErrorMessage } from '../../utils/errors';

interface FactionEditorModalProps {
  faction: FactionRecord | null;
  onClose: () => void;
  onSave: (input: SaveFactionDto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function FactionEditorModal({ faction, onClose, onSave, onDelete }: FactionEditorModalProps) {
  const [name, setName] = useState(faction?.name ?? '');
  const [description, setDescription] = useState(faction?.description ?? '');
  const [arcLabel, setArcLabel] = useState(faction?.arcLabel ?? '');
  const [color, setColor] = useState(faction?.color ?? '#6366f1');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError('Enter a faction name');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave({
        id: faction?.id,
        name: name.trim(),
        description: description.trim() || null,
        color,
        arcLabel: arcLabel.trim() || null,
      });
      onClose();
    } catch (cause: unknown) {
      setError(getErrorMessage(cause, 'Could not save the faction'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!faction) return;
    setBusy(true);
    setError('');
    try {
      await onDelete(faction.id);
      onClose();
    } catch (cause: unknown) {
      setError(getErrorMessage(cause, 'Could not delete the faction'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={faction ? `Edit ${faction.name}` : 'New faction'}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
          {faction ? (
            confirmDelete ? <Button variant="danger" size="sm" disabled={busy} onClick={remove}>Confirm delete</Button>
              : <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</Button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button loading={busy} onClick={save}>Save faction</Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} />
        <Input label="Season / arc" value={arcLabel} onChange={(event) => setArcLabel(event.target.value)} maxLength={200} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Color <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        {error && <p role="alert" style={{ color: 'var(--color-red-600)' }}>{error}</p>}
      </div>
    </Modal>
  );
}
