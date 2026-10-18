import type { Request, Response } from 'express';
import { z } from 'zod';
import type { RetrievalService } from '../services/retrieval.service.js';
import type { RetrievalConfiguration } from '../types/search.js';

const E1_BM25_RAW: RetrievalConfiguration = 'E1';

const querySchema = z.object({
  query: z.string().trim().min(1).max(1000),
  limit: z.number().int().positive().max(50).optional(),
});

export class QueryController {
  public constructor(private readonly service: RetrievalService) {}

  public search = async (request: Request, response: Response): Promise<void> => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const results = await this.service.search(parsed.data);
      response.status(200).json({
        configuration: E1_BM25_RAW,
        results,
      });
    } catch {
      response.status(500).json({ error: 'internal_server_error' });
    }
  };
}
