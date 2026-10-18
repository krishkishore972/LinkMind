import type { Request, Response } from 'express';
import { DemoSeedService } from '../services/demo-seed.service.js';
import type { DemoSeedResult } from '../services/demo-seed.service.js';

export class DemoController {
  public constructor(private readonly seedService: DemoSeedService) {}

  public seed = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.seedService.seed();
      response.status(200).json({ result });
    } catch (error) {
      console.error('Demo seed error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  };
}