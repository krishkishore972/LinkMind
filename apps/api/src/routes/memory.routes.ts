import { Router } from 'express';
import { MemoryController } from '../controllers/memory.controller.js';
import type { ResourceMemoryBuilder } from '../services/memory-builder.service.js';

export function createMemoryRouter(builder: ResourceMemoryBuilder): Router {
  const controller = new MemoryController(builder);
  const router = Router();

  router.post('/rebuild', controller.rebuild);

  return router;
}
