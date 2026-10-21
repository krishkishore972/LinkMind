import type { MemorySearchRepository } from '../repositories/memory-search.repository.js';
import { graphEdgeRepository, type GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
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
    private readonly edgeRepository: GraphEdgeRepository = graphEdgeRepository,
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

    const expandedCandidates = new Map<string, { memoryId: string; score: number; hop: number }>();

    // Add initial candidates
    for (const candidate of initialCandidates) {
      expandedCandidates.set(candidate.memoryId, { memoryId: candidate.memoryId, score: candidate.score, hop: 0 });
    }

    if (this.maxHops > 0) {
      const seedIds = initialCandidates.map((candidate) => candidate.memoryId);
      const edges = await this.edgeRepository.listAll();
      const seedScores = new Map(seedIds.map((id, index) => [id, initialCandidates[index]?.score ?? 0]));
      let expansions = 0;

      for (const edge of edges) {
        if (expansions >= this.maxExpansions) break;
        const sourceScore = seedScores.get(edge.sourceMemoryId);
        const targetScore = seedScores.get(edge.targetMemoryId);
        const connectedId = sourceScore !== undefined ? edge.targetMemoryId : targetScore !== undefined ? edge.sourceMemoryId : null;
        const seedScore = sourceScore ?? targetScore;
        if (!connectedId || seedScore === undefined || expandedCandidates.has(connectedId)) continue;

        const confidence = edge.confidence ?? 0.5;
        expandedCandidates.set(connectedId, {
          memoryId: connectedId,
          score: seedScore * confidence * 0.85,
          hop: 1,
        });
        expansions++;
      }
    }

    const memoryIds = [...expandedCandidates.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((candidate) => candidate.memoryId);
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
