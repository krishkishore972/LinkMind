import { Router } from 'express';
import { CompareController } from '../controllers/compare.controller.js';
import type { RetrievalService } from '../services/retrieval.service.js';
import type { VectorRetrievalService } from '../services/vector-retrieval.service.js';
import type { GraphRetrievalService } from '../services/graph-retrieval.service.js';

export function createCompareRouter(
  bm25Service: RetrievalService,
  vectorService: VectorRetrievalService | null,
  summaryVectorService: VectorRetrievalService | null,
  factVectorService: VectorRetrievalService | null,
  graphService: GraphRetrievalService | null,
): Router {
  const controller = new CompareController(
    bm25Service,
    vectorService,
    summaryVectorService,
    factVectorService,
    graphService,
  );
  const router = Router();

  router.post('/', controller.compare);

  return router;
}