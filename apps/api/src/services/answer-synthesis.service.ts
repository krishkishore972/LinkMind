import type { RetrievalService } from './retrieval.service.js';
import type { VectorRetrievalService } from './vector-retrieval.service.js';
import type { GraphRetrievalService } from './graph-retrieval.service.js';
import type { LLMProvider, CitationSource, CitedResponse } from './llm.provider.js';
import type { SearchResult, SearchInput, RetrievalConfiguration } from '../types/search.js';

export interface AnswerSynthesisOptions {
  retrievalConfigurations?: RetrievalConfiguration[];
  retrievalBudget?: number;
  includeCitations?: boolean;
}

export interface SynthesizedAnswer {
  query: string;
  answer: string;
  citations: CitedResponse['citations'];
  abstained: boolean;
  retrievalConfigurations: RetrievalConfiguration[];
  retrievedSources: CitationSource[];
  latencyMs: number;
}

export class AnswerSynthesisService {
  public constructor(
    private readonly bm25Service: RetrievalService,
    private readonly vectorService: VectorRetrievalService | null,
    private readonly summaryVectorService: VectorRetrievalService | null,
    private readonly factVectorService: VectorRetrievalService | null,
    private readonly graphService: { search: (input: SearchInput) => Promise<readonly import('../types/search.js').SearchResult[]> } | null,
    private readonly llmProvider: LLMProvider,
  ) {}

  public async synthesizeAnswer(
    query: string,
    options: AnswerSynthesisOptions = {}
  ): Promise<SynthesizedAnswer> {
    const start = process.hrtime.bigint();

    const configurations = options.retrievalConfigurations ?? ['E1', 'E2'];
    const budget = options.retrievalBudget ?? 10;
    const includeCitations = options.includeCitations ?? true;

    // Retrieve from all requested configurations
    const allSources: CitationSource[] = [];
    const seenMemoryIds = new Set<string>();

    for (const config of configurations) {
      try {
        let results: readonly SearchResult[] = [];

        if (config === 'E1') {
          results = await this.bm25Service.search({ query, limit: options.retrievalBudget });
        } else if (config === 'E2' && this.vectorService) {
          results = await this.vectorService.search({ query, limit: options.retrievalBudget });
        } else if (config === 'E3' && this.summaryVectorService) {
          results = await this.summaryVectorService.search({ query, limit: options.retrievalBudget });
        } else if (config === 'E4' && this.factVectorService) {
          results = await this.factVectorService.search({ query, limit: options.retrievalBudget });
        } else if (config === 'E5' && this.graphService) {
          results = await this.graphService.search({ query, limit: options.retrievalBudget });
        }

        // Deduplicate by memoryId
        for (const result of results) {
          if (!seenMemoryIds.has(result.memoryId)) {
            seenMemoryIds.add(result.memoryId);
            allSources.push({
              memoryId: result.memoryId,
              resourceId: result.resourceId,
              resourceTitle: result.resourceTitle,
              sourceUrl: result.sourceUrl,
              content: result.content,
              evidenceText: result.evidenceText ?? result.content,
              score: result.score,
              rank: result.rank,
            });
          }
        }
      } catch (error) {
        console.error(`Error retrieving from ${config}:`, error);
      }
    }

    // Synthesize answer
    const llmResponse = await this.llmProvider.generateWithCitations(query, allSources);

    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

    return {
      query,
      answer: llmResponse.answer,
      citations: includeCitations ? llmResponse.citations : [],
      abstained: llmResponse.abstained,
      retrievalConfigurations: options.retrievalConfigurations ?? ['E1', 'E2'],
      retrievedSources: allSources,
      latencyMs: Math.round(latencyMs),
    };
  }
}
