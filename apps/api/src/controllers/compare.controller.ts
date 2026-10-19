import type { Request, Response } from 'express';
import { z } from 'zod';
import type { RetrievalService } from '../services/retrieval.service.js';
import type { VectorRetrievalService } from '../services/vector-retrieval.service.js';
import type { SearchResult } from '../types/search.js';

const compareSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  limit: z.number().int().positive().max(50).optional(),
  configurations: z.array(z.enum(['E1', 'E2', 'E3', 'E4', 'E5'])).optional(),
});

const E1_BM25_RAW: 'E1' = 'E1';
const E2_VECTOR_RAW: 'E2' = 'E2';

interface CompareResult {
  configuration: 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
  results: readonly SearchResult[];
  latencyMs: number;
}

export class CompareController {
  public constructor(
    private readonly bm25Service: RetrievalService,
    private readonly vectorService: VectorRetrievalService | null,
  ) {}

  public compare = async (request: Request, response: Response): Promise<void> => {
    const parsed = compareSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { query, limit, configurations = ['E1', 'E2'] } = parsed.data;
    const input = { query, limit };

    const results: CompareResult[] = [];

    for (const config of configurations) {
      const start = process.hrtime.bigint();

      try {
        let searchResults: readonly SearchResult[] = [];

        if (config === 'E1') {
          searchResults = await this.bm25Service.search(input);
        } else if (config === 'E2' && this.vectorService) {
          searchResults = await this.vectorService.search(input);
        } else {
          searchResults = [];
        }

        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1_000_000;

        results.push({
          configuration: config,
          results: searchResults,
          latencyMs: Math.round(latencyMs),
        });
      } catch (error) {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1_000_000;

        results.push({
          configuration: config,
          results: [],
          latencyMs: Math.round(latencyMs),
        });
      }
    }

    response.status(200).json({ results });
  };
}