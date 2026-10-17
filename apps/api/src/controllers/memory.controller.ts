import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ResourceMemoryBuilder } from '../services/memory-builder.service.js';

const rebuildSchema = z.object({
  resourceIds: z.array(z.string().trim().min(1)).optional(),
  maxCharacters: z.number().int().positive().optional(),
  overlapCharacters: z.number().int().nonnegative().optional(),
});

export class MemoryController {
  public constructor(private readonly builder: ResourceMemoryBuilder) {}

  public rebuild = async (request: Request, response: Response): Promise<void> => {
    const parsed = rebuildSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await this.builder.rebuild(parsed.data);
      response.status(200).json(result);
    } catch {
      response.status(500).json({ error: 'internal_server_error' });
    }
  };
}
