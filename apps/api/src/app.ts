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
import { createEvaluationRouter } from './routes/evaluation.routes.js';
import { createAnswerRouter } from './routes/answer.routes.js';
import { DemoSeedService } from './services/demo-seed.service.js';
import { EmbeddingBuilder } from './services/embedding-builder.service.js';
import { EvaluationService } from './services/evaluation.service.js';
import { FakeEmbeddingProvider, createFakeEmbeddingProvider } from './services/fake-embedding.provider.js';
import { createGeminiEmbeddingProvider } from './services/gemini-embedding.provider.js';
import { FakeLLMProvider, createFakeLLMProvider } from './services/fake-llm.provider.js';
import { createGeminiLLMProvider } from './services/gemini-llm.provider.js';
import { createGroqLLMProvider } from './services/groq-llm.provider.js';
import { VectorRetrievalServiceImpl } from './services/vector-retrieval.service.js';
import { SummaryBuilder } from './services/summary-builder.service.js';
import { FactBuilder } from './services/fact-builder.service.js';
import { GraphRetrievalServiceImpl } from './services/graph-retrieval.service.js';
import { AnswerSynthesisService } from './services/answer-synthesis.service.js';
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
  llmProvider?: { model: string; maxTokens: number; generate: (prompt: string, options?: any) => Promise<string>; generateWithCitations: (prompt: string, sources: any[]) => Promise<any> };
};

function resolveEmbeddingProvider(): { model: string; dimensions: number; embed: (texts: readonly string[]) => Promise<number[][]>; embedSingle: (text: string) => Promise<number[]> } {
  const explicitProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase();

  if (explicitProvider === 'fake') {
    console.log('[DEBUG] Using fake embedding provider');
    return createFakeEmbeddingProvider();
  }

  if (explicitProvider === 'gemini' || process.env.GEMINI_API_KEY) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required when EMBEDDING_PROVIDER=gemini');
    }
    const model = (process.env.EMBEDDING_MODEL as 'text-embedding-004' | 'text-embedding-004-1536' | 'gemini-embedding-2') ?? 'gemini-embedding-2';
    console.log('[DEBUG] Using Gemini embedding provider with model:', model);
    return createGeminiEmbeddingProvider(process.env.GEMINI_API_KEY, model);
  }

  console.log('[DEBUG] Using fake embedding provider (fallback)');
  return createFakeEmbeddingProvider();
}

function resolveLLMProvider(): { model: string; maxTokens: number; generate: (prompt: string, options?: any) => Promise<string>; generateWithCitations: (prompt: string, sources: any[]) => Promise<any> } {
  const explicitProvider = process.env.LLM_PROVIDER?.toLowerCase();

  if (explicitProvider === 'fake') {
    console.log('[DEBUG] Using fake LLM provider');
    return createFakeLLMProvider();
  }

  if (explicitProvider === 'groq') {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is required when LLM_PROVIDER=groq');
    }
    const model = process.env.LLM_MODEL ?? 'openai/gpt-oss-120b';
    console.log('[DEBUG] Using Groq LLM provider with model:', model);
    return createGroqLLMProvider(process.env.GROQ_API_KEY, model);
  }

  if (explicitProvider === 'gemini' || (!explicitProvider && process.env.GEMINI_API_KEY)) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
    }
    const model = process.env.LLM_MODEL ?? 'gemini-flash-latest';
    console.log('[DEBUG] Using Gemini LLM provider with model:', model);
    return createGeminiLLMProvider(process.env.GEMINI_API_KEY, model);
  }

  console.log('[DEBUG] Using fake LLM provider (fallback)');
  return createFakeLLMProvider();
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
    llmProvider = resolveLLMProvider(),
  } = dependencies;
  const app = express();

  const vectorService = new VectorRetrievalServiceImpl(embeddingProvider, memorySearchRepository, 'raw');
  const summaryVectorService = new VectorRetrievalServiceImpl(embeddingProvider, memorySearchRepository, 'summary');
  const factVectorService = new VectorRetrievalServiceImpl(embeddingProvider, memorySearchRepository, 'fact');
  const graphRetrievalService = new GraphRetrievalServiceImpl(embeddingProvider, memorySearchRepository);
  const embeddingBuilder = new EmbeddingBuilder(memoryRepository, embeddingProvider);
  const summaryBuilder = new SummaryBuilder(resourceService, memoryRepository, embeddingProvider);
  const factBuilder = new FactBuilder(resourceService, memoryRepository, embeddingProvider);
  const evaluationService = new EvaluationService(retrievalService, vectorService);
  const answerService = new AnswerSynthesisService(
    retrievalService,
    vectorService,
    summaryVectorService,
    factVectorService,
    graphRetrievalService,
    llmProvider,
  );

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' }));
  app.use(helmet());
  app.use(express.json());

  app.use('/api/resources', createResourceRouter(resourceService));
  app.use('/api/memories', createMemoryRouter(memoryBuilder));
  app.use('/api/query', createQueryRouter(retrievalService));
  app.use('/api/compare', createCompareRouter(
    retrievalService,
    vectorService,
    summaryVectorService,
    factVectorService,
    graphRetrievalService,
  ));
  app.use('/api/evaluation', createEvaluationRouter(evaluationService));
  app.use('/api/answer', createAnswerRouter(answerService));
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

  app.post('/api/summaries/build', async (request: Request, response: Response) => {
    try {
      const { resourceIds, batchSize } = request.body ?? {};
      const result = await summaryBuilder.build({ resourceIds, batchSize });
      response.status(200).json({ result });
    } catch (error) {
      console.error('Summary build error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  });

  app.post('/api/facts/build', async (request: Request, response: Response) => {
    try {
      const { resourceIds, batchSize } = request.body ?? {};
      const result = await factBuilder.build({ resourceIds, batchSize });
      response.status(200).json({ result });
    } catch (error) {
      console.error('Fact build error:', error);
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
