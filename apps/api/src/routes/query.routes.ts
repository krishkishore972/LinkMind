import { Router } from 'express';
import { QueryController } from '../controllers/query.controller.js';
import type { RetrievalService } from '../services/retrieval.service.js';

export function createQueryRouter(service: RetrievalService): Router {
  const controller = new QueryController(service);
  const router = Router();

  router.post('/', controller.search);

  return router;
}
