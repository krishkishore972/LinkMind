import type { MemorySearchRepository } from '../repositories/memory-search.repository.js';
import { vectorRepository } from '../repositories/vector.repository.js';
import type { EmbeddingProvider } from './embedding.provider.js';
import type { SearchInput, SearchResult } from '../types/search.js';

export interface VectorRetrievalService {
  search(input: SearchInput): Promise<readonly SearchResult[]>;
}

export class VectorRetrievalServiceImpl implements VectorRetrievalService {
  public constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly searchRepository: MemorySearchRepository,
  ) {}

  public async search(input: SearchInput): Promise<readonly SearchResult[]> {
    const queryVector = await this.embeddingProvider.embedSingle(input.query);
    const limit = input.limit ?? 10;

    const similar = await vectorRepository.searchSimilar(queryVector, 'raw', limit);

    if (similar.length === 0) {
      return [];
    }

    const memoryIds = similar.map((s) => s.memoryId);
    const documents = await this.searchRepository.listRawDocumentsByIds(memoryIds);

    const docMap = new Map(documents.map((d) => [d.memoryId, d]));
    const results: SearchResult[] = [];

    for (const { memoryId, score } of similar) {
      const doc = docMap.get(memoryId);
      if (doc) {
        results.push({ ...doc, score, rank: results.length + 1 });
      }
    }

    return results;
  }
}