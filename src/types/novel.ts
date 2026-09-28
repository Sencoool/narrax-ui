export interface Novel {
  id: string;
  title: string;
  summary?: string | null;
  status: 'draft' | 'unpublished' | 'published';
  authorId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  context?: NovelContext | null;
  _count?: { episodes: number; chunks?: number };
}

export interface NovelContext {
  id: string;
  novelId: string;
  characters: Character[];
  /** Free-text world/setting description */
  worldBuilding: string | null;
  plotOutline: string | null;
  writingStyle: string | null;
  updatedAt: string;
}

export interface Character {
  name: string;
  description?: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'other';
  imageUrl?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateNovelDto {
  title: string;
  summary?: string;
  status?: 'draft' | 'unpublished' | 'published';
  tags?: string[];
}

export type UpdateNovelDto = Partial<CreateNovelDto>;

export interface FindNovelsQuery {
  status?: 'draft' | 'unpublished' | 'published';
  authorId?: string;
  page?: number;
  limit?: number;
}

export interface UpsertNovelContextDto {
  characters?: Character[];
  worldBuilding?: string;
  plotOutline?: string;
  writingStyle?: string;
}
