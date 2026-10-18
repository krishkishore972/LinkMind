import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { checkDatabaseHealth, type DatabaseHealth } from '@repo/db';
import { resourceRepository } from './repositories/resource.repository.js';
import { createResourceRouter } from './routes/resource.routes.js';
import { createMemoryRouter } from './routes/memory.routes.js';
import { memoryRepository } from './repositories/memory.repository.js';
import { ResourceMemoryBuilder } from './services/memory-builder.service.js';
import { createQueryRouter } from './routes/query.routes.js';
import { memorySearchRepository } from './repositories/memory-search.repository.js';
import { createDemoRouter } from './routes/demo.routes.js';
import { DemoSeedService } from './services/demo-seed.service.js';
import {
  Bm25RetrievalService,
  type RetrievalService,
} from './services/retrieval.service.js';
import {
  DefaultResourceService,
  type ResourceService,
} from './services/resource.service.js';

export type HealthCheck = () => Promise<DatabaseHealth>;

export type AppDependencies = {
  healthCheck?: HealthCheck;
  resourceService?: ResourceService;
  memoryBuilder?: ResourceMemoryBuilder;
  retrievalService?: RetrievalService;
  seedService?: DemoSeedService;
};

export function createApp(healthCheck?: HealthCheck): Express;
export function createApp(dependencies?: AppDependencies): Express;
export function createApp(
  input: HealthCheck | AppDependencies = {},
): Express {
  const dependencies = typeof input === 'function' ? { healthCheck: input } : input;
  const {
    healthCheck = checkDatabaseHealth,
    resourceService = new DefaultResourceService(resourceRepository),
    memoryBuilder = new ResourceMemoryBuilder(resourceService, memoryRepository),
    retrievalService = new Bm25RetrievalService(memorySearchRepository),
    seedService = new DemoSeedService(resourceRepository, resourceService, memoryRepository),
  } = dependencies;
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' }));
  app.use(helmet());
  app.use(express.json());

  app.use('/api/resources', createResourceRouter(resourceService));
  app.use('/api/memories', createMemoryRouter(memoryBuilder));
  app.use('/api/query', createQueryRouter(retrievalService));
  app.use('/api/demo', createDemoRouter(seedService));

  app.get('/api/health', async (_request: Request, response: Response) => {
    try {
      const database = await healthCheck();
      const healthy = database.database && database.pgvector;

      response.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        database,
      });
    } catch {
      response.status(503).json({
        status: 'unhealthy',
        database: {
          database: false,
          pgvector: false,
        },
      });
    }
  });

  return app;
}
