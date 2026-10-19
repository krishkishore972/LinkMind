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
import { createCompareRouter } from './routes/compare.routes.js';
import { memorySearchRepository } from './repositories/memory-search.repository.js';
import { createDemoRouter } from './routes/demo.routes.js';
import { DemoSeedService } from './services/demo-seed.service.js';
import { EmbeddingBuilder } from './services/embedding-builder.service.js';
import { FakeEmbeddingProvider, createFakeEmbeddingProvider } from './services/fake-embedding.provider.js';
import { VectorRetrievalServiceImpl } from './services/vector-retrieval.service.js';
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
  embeddingProvider?: { model: string; dimensions: number; embed: (texts: readonly string[]) => Promise<number[][]>; embedSingle: (text: string) => Promise<number[]> };
};

function resolveEmbeddingProvider(): { model: string; dimensions: number; embed: (texts: readonly string[]) => Promise<number[][]>; embedSingle: (text: string) => Promise<number[]> } {
  const explicitProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase();

  if (explicitProvider === 'fake') {
    return createFakeEmbeddingProvider();
  }

  if (explicitProvider === 'gemini' || process.env.GEMINI_API_KEY) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required when EMBEDDING_PROVIDER=gemini');
    }
    // TODO: Implement GeminiEmbeddingProvider when needed
    // return createGeminiEmbeddingProvider(process.env.GEMINI_API_KEY);
    console.warn('Gemini provider not implemented yet, falling back to fake provider');
    return createFakeEmbeddingProvider();
  }

  return createFakeEmbeddingProvider();
}

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
    embeddingProvider = resolveEmbeddingProvider(),
  } = dependencies;
  const app = express();

  const vectorService = new VectorRetrievalServiceImpl(embeddingProvider, memorySearchRepository);
  const embeddingBuilder = new EmbeddingBuilder(memoryRepository, embeddingProvider);

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' }));
  app.use(helmet());
  app.use(express.json());

  app.use('/api/resources', createResourceRouter(resourceService));
  app.use('/api/memories', createMemoryRouter(memoryBuilder));
  app.use('/api/query', createQueryRouter(retrievalService));
  app.use('/api/compare', createCompareRouter(retrievalService, vectorService));
  app.use('/api/demo', createDemoRouter(seedService));

  app.post('/api/embeddings/build', async (request: Request, response: Response) => {
    try {
      const { resourceIds, representations, batchSize } = request.body ?? {};
      const result = await embeddingBuilder.build({
        resourceIds,
        representations,
        batchSize,
      });
      response.status(200).json({ result });
    } catch (error) {
      console.error('Embedding build error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  });

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
