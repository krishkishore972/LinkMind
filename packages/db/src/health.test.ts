import { describe, expect, it } from 'vitest';
import { checkDatabaseHealth, toDatabaseHealth } from './health.js';

describe('toDatabaseHealth', () => {
  it('reports healthy when connected and pgvector is installed', () => {
    expect(toDatabaseHealth({ connected: 1, vectorInstalled: true })).toEqual({
      database: true,
      pgvector: true,
    });
  });

  it('reports degraded when pgvector is missing', () => {
    expect(toDatabaseHealth({ connected: 1, vectorInstalled: false })).toEqual({
      database: true,
      pgvector: false,
    });
  });

  it('reports unavailable when no row is returned', () => {
    expect(toDatabaseHealth(undefined)).toEqual({
      database: false,
      pgvector: false,
    });
  });
});

describe('checkDatabaseHealth', () => {
  it('maps the injected row query to a health result', async () => {
    await expect(
      checkDatabaseHealth(async () => ({ connected: 1, vectorInstalled: true })),
    ).resolves.toEqual({ database: true, pgvector: true });
  });

  it('propagates a failing row query', async () => {
    await expect(
      checkDatabaseHealth(async () => {
        throw new Error('connection refused');
      }),
    ).rejects.toThrow('connection refused');
  });
});
