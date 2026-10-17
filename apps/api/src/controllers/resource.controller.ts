import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ResourceService } from '../services/resource.service.js';
import {
  resourceTypeSchema,
  type CreateResourceInput,
} from '../types/resource.js';

const createResourceSchema = z.object({
  title: z.string().trim().min(1).max(500),
  type: resourceTypeSchema,
  sourceUrl: z.string().url().optional(),
  content: z.string().min(1),
});

export class ResourceController {
  public constructor(private readonly service: ResourceService) {}

  public list = async (_request: Request, response: Response): Promise<void> => {
    try {
      const resources = await this.service.list();
      response.status(200).json({ resources });
    } catch {
      response.status(500).json({ error: 'internal_server_error' });
    }
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const parsed = createResourceSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const resource = await this.service.create(parsed.data as CreateResourceInput);
      response.status(201).json({ resource });
    } catch {
      response.status(500).json({ error: 'internal_server_error' });
    }
  };

  public findById = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id;
    if (typeof id !== 'string') {
      response.status(400).json({ error: 'invalid_resource_id' });
      return;
    }

    try {
      const resource = await this.service.findById(id);
      if (!resource) {
        response.status(404).json({ error: 'resource_not_found' });
        return;
      }

      response.status(200).json({ resource });
    } catch {
      response.status(500).json({ error: 'internal_server_error' });
    }
  };
}
