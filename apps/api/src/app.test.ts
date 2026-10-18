import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import type { RetrievalService } from './services/retrieval.service.js';

const fakeRetrievalService: RetrievalService = {
  search: async () => [
    {
      memoryId: 'memory-1',
      resourceId: 'resource-1',
      resourceTitle: 'Test resource',
      content: 'Database notes',
      evidenceText: 'Database notes',
      score: 1.5,
      rank: 1,
    },
  ],
};

describe('GET /api/health', () => {
  it('returns healthy when PostgreSQL and pgvector are available', async () => {
    const app = createApp(async () => ({ database: true, pgvector: true }));

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      database: { database: true, pgvector: true },
    });
  });

  it('returns degraded when pgvector is unavailable', async () => {
    const app = createApp(async () => ({ database: true, pgvector: false }));

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
  });

  it('returns unhealthy when the health check fails', async () => {
    const app = createApp(async () => {
      throw new Error('database unavailable');
    });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
  });
});

describe('POST /api/query', () => {
  it('returns ranked retrieval results', async () => {
    const app = createApp({ retrievalService: fakeRetrievalService });

    const response = await request(app)
      .post('/api/query')
      .send({ query: 'database', limit: 3 });

    expect(response.status).toBe(200);
    expect(response.body.configuration).toBe('E1');
    expect(response.body.results[0]).toMatchObject({
      memoryId: 'memory-1',
      rank: 1,
    });
  });

  it('rejects an empty query', async () => {
    const app = createApp({ retrievalService: fakeRetrievalService });

    const response = await request(app).post('/api/query').send({ query: '  ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });
});
