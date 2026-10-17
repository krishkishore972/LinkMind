import type { MemorySearchRepository } from '../repositories/memory-search.repository.js';
import { searchBm25 } from './bm25.service.js';
import type { SearchInput, SearchResult } from '../types/search.js';

export interface RetrievalService {
  search(input: SearchInput): Promise<readonly SearchResult[]>;
}

export class Bm25RetrievalService implements RetrievalService {
  public constructor(private readonly repository: MemorySearchRepository) {}

  public async search(input: SearchInput): Promise<readonly SearchResult[]> {
    const documents = await this.repository.listRawDocuments();
    return searchBm25(input.query, documents, input.limit ?? 10);
  }
}
