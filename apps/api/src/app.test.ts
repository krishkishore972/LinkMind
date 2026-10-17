import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

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
