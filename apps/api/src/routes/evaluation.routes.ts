import { Router } from 'express';
import { EvaluationController } from '../controllers/evaluation.controller.js';
import type { EvaluationService } from '../services/evaluation.service.js';

export function createEvaluationRouter(evaluationService: EvaluationService): Router {
  const controller = new EvaluationController(evaluationService);
  const router = Router();

  router.post('/run', controller.run);
  router.get('/runs', controller.listRuns);
  router.get('/runs/:id', controller.getRun);
  router.get('/runs/:id.csv', controller.getRunCsv);

  return router;
}