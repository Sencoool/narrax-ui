import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import type { CharacterRecord, FactionRecord, SaveCharacterDto } from '../../types/character';
import { getErrorMessage } from '../../utils/errors';

interface CharacterEditorModalProps {
  character: CharacterRecord | null;
  factions: FactionRecord[];
  onClose: () => void;
  onSave: (input: SaveCharacterDto) => Promise<CharacterRecord>;
  onDelete: (id: string) => Promise<void>;
  onUpload: (characterId: string, file: File) => Promise<void>;
}

export function CharacterEditorModal({ character, factions, onClose, onSave, onDelete, onUpload }: CharacterEditorModalProps) {
  const [name, setName] = useState(character?.name ?? '');
  const [role, setRole] = useState(character?.role ?? 'other');
  const [description, setDescription] = useState(character?.description ?? '');
  const [introducedAtOrder, setIntroducedAtOrder] = useState(character?.introducedAtOrder?.toString() ?? '');
  const [factionIds, setFactionIds] = useState(character?.factionIds ?? []);
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedId, setSavedId] = useState(character?.id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const save = async () => {
    setNameError('');
    setError('');
    if (!name.trim()) {
      setNameError('Enter a character name');
      return;
    }
    const order = introducedAtOrder.trim() ? Number(introducedAtOrder) : null;
    if (order !== null && (!Number.isInteger(order) || order < 1)) {
      setError('Introduction episode must be a positive whole number');
      return;
    }
    setBusy(true);
    try {
      const saved = await onSave({
        id: savedId,
        name: name.trim(),
        role,
        description: description.trim() || null,
        introducedAtOrder: order,
        factionIds,
      });
      setSavedId(saved.id);
      if (imageFile) await onUpload(saved.id, imageFile);
      onClose();
    } catch (cause: unknown) {
      if (axios.isAxiosError(cause) && cause.response?.status === 409) {
        setNameError('A character with this name already exists');
      } else {
        setError(getErrorMessage(cause, 'Could not save the character'));
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!character) return;
    setBusy(true);
    setError('');
    try {
      await onDelete(character.id);
      onClose();
    } catch (cause: unknown) {
      setError(getErrorMessage(cause, 'Could not delete the character'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={character ? `Edit ${character.name}` : 'New character'}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
          {character ? (
            confirmDelete ? <Button variant="danger" size="sm" disabled={busy} onClick={remove}>Confirm delete</Button>
              : <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</Button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button loading={busy} onClick={save}>Save character</Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
          {nameError && <p role="alert" style={{ color: 'var(--color-red-600)', fontSize: '0.8rem' }}>{nameError}</p>}
        </div>
        <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.375rem' }}>
            <option value="protagonist">ตัวเอก</option>
            <option value="antagonist">ตัวร้าย</option>
            <option value="supporting">ตัวประกอบ</option>
            <option value="other">อื่น ๆ</option>
          </select>
        </label>
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} />
        <Input
          label="ปรากฏตอนที่ (เว้นว่าง = รู้จักตั้งแต่ต้น)"
          type="number"
          min={1}
          step={1}
          value={introducedAtOrder}
          onChange={(event) => setIntroducedAtOrder(event.target.value)}
        />
        <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
          <legend style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Factions</legend>
          {factions.length ? factions.map((faction) => (
            <label key={faction.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', margin: '0.25rem 0.75rem 0.25rem 0' }}>
              <input
                type="checkbox"
                checked={factionIds.includes(faction.id)}
                onChange={(event) => setFactionIds((current) => event.target.checked
                  ? [...current, faction.id]
                  : current.filter((id) => id !== faction.id))}
              />
              {faction.name}
            </label>
          )) : <span style={{ color: 'var(--color-text-muted)' }}>No factions yet</span>}
        </fieldset>
        <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Character image (PNG, JPEG, or WebP; up to 5 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setImageFile(file);
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
            }}
            style={{ display: 'block', marginTop: '0.375rem' }}
          />
        </label>
        {previewUrl && <img src={previewUrl} alt="Character image preview" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />}
        {error && <p role="alert" style={{ color: 'var(--color-red-600)' }}>{error}</p>}
      </div>
    </Modal>
  );
}
