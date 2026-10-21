import { Router } from 'express';
import { AnswerController } from '../controllers/answer.controller.js';
import type { AnswerSynthesisService } from '../services/answer-synthesis.service.js';

export function createAnswerRouter(answerService: AnswerSynthesisService): Router {
  const controller = new AnswerController(answerService);
  const router = Router();

  router.post('/generate', controller.generate);

  return router;
}