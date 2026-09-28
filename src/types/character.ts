export interface CharacterRecord {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  introducedAtOrder: number | null;
  sortOrder: number;
  factionIds: string[];
  factionMemberships: { factionId: string; rank: string | null }[];
  imageUrl: string | null;
}

export interface FactionRecord {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  arcLabel: string | null;
  sortOrder: number;
}

export interface CharacterBoard {
  characters: CharacterRecord[];
  factions: FactionRecord[];
}

export interface SaveCharacterDto {
  id?: string;
  name: string;
  role?: string | null;
  description?: string | null;
  introducedAtOrder?: number | null;
  sortOrder?: number;
  factionIds: string[];
}

export interface SaveFactionDto {
  id?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  arcLabel?: string | null;
  sortOrder?: number;
}
