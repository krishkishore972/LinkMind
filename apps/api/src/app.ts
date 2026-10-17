import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { checkDatabaseHealth, type DatabaseHealth } from '@repo/db';
import { resourceRepository } from './repositories/resource.repository.js';
import { createResourceRouter } from './routes/resource.routes.js';
import {
  DefaultResourceService,
  type ResourceService,
} from './services/resource.service.js';

export type HealthCheck = () => Promise<DatabaseHealth>;

export type AppDependencies = {
  healthCheck?: HealthCheck;
  resourceService?: ResourceService;
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
  } = dependencies;
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' }));
  app.use(helmet());
  app.use(express.json());

  app.use('/api/resources', createResourceRouter(resourceService));

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
