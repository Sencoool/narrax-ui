import api from './api';
import type {
  CharacterBoard,
  CharacterRecord,
  FactionRecord,
  SaveCharacterDto,
  SaveFactionDto,
} from '../types/character';

export const characterService = {
  async getBoard(novelId: string): Promise<CharacterBoard> {
    const { data } = await api.get<CharacterBoard>(`/novels/${novelId}/characters`);
    return data;
  },

  async saveCharacter(novelId: string, dto: SaveCharacterDto): Promise<CharacterRecord> {
    const { data } = await api.post<CharacterRecord>(`/novels/${novelId}/characters`, dto);
    return data;
  },

  async deleteCharacter(novelId: string, id: string): Promise<void> {
    await api.delete(`/novels/${novelId}/characters/${id}`);
  },

  async saveFaction(novelId: string, dto: SaveFactionDto): Promise<FactionRecord> {
    const { data } = await api.post<FactionRecord>(`/novels/${novelId}/factions`, dto);
    return data;
  },

  async deleteFaction(novelId: string, id: string): Promise<void> {
    await api.delete(`/novels/${novelId}/factions/${id}`);
  },

  async uploadImage(novelId: string, characterId: string, file: File): Promise<void> {
    const body = new FormData();
    body.append('file', file);
    await api.post(`/novels/${novelId}/characters/${characterId}/image`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async getImage(url: string): Promise<Blob> {
    const { data } = await api.get<Blob>(url, { responseType: 'blob' });
    return data;
  },
};
