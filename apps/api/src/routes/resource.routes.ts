import { Router } from 'express';
import { ResourceController } from '../controllers/resource.controller.js';
import type { ResourceService } from '../services/resource.service.js';

export function createResourceRouter(service: ResourceService): Router {
  const controller = new ResourceController(service);
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.findById);

  return router;
}
