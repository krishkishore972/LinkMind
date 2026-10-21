import type { MemorySearchRepository } from '../repositories/memory-search.repository.js';
import { vectorRepository } from '../repositories/vector.repository.js';
import type { EmbeddingProvider } from './embedding.provider.js';
import type { SearchInput, SearchResult } from '../types/search.js';

export interface GraphRetrievalService {
  search(input: SearchInput): Promise<readonly SearchResult[]>;
}

export class GraphRetrievalServiceImpl {
  public constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly searchRepository: MemorySearchRepository,
    private readonly maxHops: number = 1,
    private readonly maxExpansions: number = 20,
  ) {}

  public async search(input: SearchInput): Promise<readonly SearchResult[]> {
    const queryVector = await this.embeddingProvider.embedSingle(input.query);
    const limit = input.limit ?? 10;

    // Step 1: Get initial candidates via vector search on facts
    const initialCandidates = await vectorRepository.searchSimilar(queryVector, 'fact', limit * 2);

    if (initialCandidates.length === 0) {
      return [];
    }

    // Step 2: Expand through graph edges (simplified - would use GraphEdgeRepository in full impl)
    const expandedCandidates = new Map<string, { memoryId: string; score: number; hop: number }>();

    // Add initial candidates
    for (const candidate of initialCandidates) {
      expandedCandidates.set(candidate.memoryId, { memoryId: candidate.memoryId, score: candidate.score, hop: 0 });
    }

    // Step 3: Graph expansion (simplified - would use GraphEdgeRepository in full implementation)
    // For now, just return initial candidates ranked by score

    const memoryIds = Array.from(expandedCandidates.keys()).slice(0, limit);
    const documents = await this.searchRepository.listRawDocumentsByIds(memoryIds, 'fact');

    const docMap = new Map(documents.map((d) => [d.memoryId, d]));
    const results: SearchResult[] = [];

    for (const memoryId of memoryIds) {
      const candidate = expandedCandidates.get(memoryId);
      const doc = docMap.get(memoryId);
      if (candidate && doc) {
        results.push({ ...doc, score: candidate.score, rank: results.length + 1 });
      }
    }

    return results;
  }
}

export type { SearchInput, SearchResult } from '../types/search.js';
