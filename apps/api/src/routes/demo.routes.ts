import { Router } from 'express';
import { DemoController } from '../controllers/demo.controller.js';
import type { DemoSeedService } from '../services/demo-seed.service.js';

export function createDemoRouter(seedService: DemoSeedService): Router {
  const controller = new DemoController(seedService);
  const router = Router();

  router.post('/seed', controller.seed);

  return router;
}