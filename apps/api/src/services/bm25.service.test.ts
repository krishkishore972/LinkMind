import { describe, expect, it } from 'vitest';
import { searchBm25, tokenize } from './bm25.service.js';
import type { SearchDocument } from '../types/search.js';

const documents: readonly SearchDocument[] = [
  {
    memoryId: 'memory-prisma',
    resourceId: 'resource-prisma',
    resourceTitle: 'Prisma notes',
    content: 'Prisma maps database tables to TypeScript objects.',
    evidenceText: 'Prisma maps database tables to TypeScript objects.',
  },
  {
    memoryId: 'memory-garden',
    resourceId: 'resource-garden',
    resourceTitle: 'Garden notes',
    content: 'Tomatoes need sunlight and regular watering.',
    evidenceText: 'Tomatoes need sunlight and regular watering.',
  },
];

describe('searchBm25', () => {
  it('tokenizes case-insensitively and ignores punctuation', () => {
    expect(tokenize('Prisma, TypeScript!')).toEqual(['prisma', 'typescript']);
  });

  it('ranks the relevant raw memory first', () => {
    const results = searchBm25('database TypeScript', documents, 3);

    expect(results).toHaveLength(1);
    expect(results[0]?.memoryId).toBe('memory-prisma');
    expect(results[0]?.rank).toBe(1);
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it('returns an empty result for empty queries or collections', () => {
    expect(searchBm25('   ', documents)).toEqual([]);
    expect(searchBm25('database', [])).toEqual([]);
  });

  it('uses memory id as a stable tie breaker', () => {
    const tied = documents.map((document) => ({ ...document, content: 'shared term' }));
    const results = searchBm25('shared', tied, 2);

    expect(results.map((result) => result.memoryId)).toEqual([
      'memory-garden',
      'memory-prisma',
    ]);
  });
});
