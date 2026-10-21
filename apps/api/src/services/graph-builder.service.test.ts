import { describe, expect, it } from 'vitest';
import { GraphBuilder } from './graph-builder.service.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { MemoryRepository } from '../repositories/memory.repository.js';
import type { MemoryItemRecord } from '../types/memory.js';

function fact(id: string, resourceId: string, entities: string[]): MemoryItemRecord {
  return {
    id,
    resourceId,
    representation: 'fact',
    chunkIndex: null,
    content: `${entities[0]} uses ${entities[1] ?? 'the system'}`,
    evidenceText: 'Supporting evidence.',
    evidenceStart: 0,
    evidenceEnd: 20,
    provenance: 'generated',
    metadata: { entities },
    embedding: null,
    embeddingModel: null,
    embeddingDimensions: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('GraphBuilder', () => {
  it('links selected new-resource facts to facts from the existing corpus', async () => {
    const memories = [
      fact('old-fact', 'old-resource', ['LinkMind', 'pgvector']),
      fact('new-fact', 'new-resource', ['LinkMind', 'Gemini']),
    ];
    const created: Array<{ sourceMemoryId: string; targetMemoryId: string; relation: string }> = [];
    const memoryRepository = {
      findByRepresentation: async () => memories,
    } as unknown as MemoryRepository;
    const edgeRepository: GraphEdgeRepository = {
      listAll: async () => [],
      deleteForMemoryIds: async () => undefined,
      createIfMissing: async (input) => {
        created.push(input);
        return { id: 'edge-1', ...input };
      },
    };

    const result = await new GraphBuilder(memoryRepository, edgeRepository).build({ resourceIds: ['new-resource'] });

    expect(result.edgesCreated).toBe(2);
    expect(created).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceMemoryId: 'new-fact', targetMemoryId: 'old-fact', relation: 'same_entity' }),
        expect.objectContaining({ sourceMemoryId: 'new-fact', targetMemoryId: 'old-fact', relation: 'related_to' }),
      ]),
    );
  });
});
