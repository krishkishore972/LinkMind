import { describe, expect, it } from 'vitest';
import { ResourceMemoryBuilder } from './memory-builder.service.js';
import type { MemoryRepository } from '../repositories/memory.repository.js';
import type { MemoryItemRecord } from '../types/memory.js';
import type { ResourceRepository } from '../repositories/resource.repository.js';
import { DefaultResourceService } from './resource.service.js';

function memoryRecord(
  resourceId: string,
  chunkIndex: number,
  content: string,
): MemoryItemRecord {
  return {
    id: `${resourceId}-${chunkIndex}`,
    resourceId,
    representation: 'raw',
    chunkIndex,
    content,
    evidenceText: content,
    evidenceStart: 0,
    evidenceEnd: content.length,
    provenance: 'verified',
    metadata: { source: 'resource-content' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ResourceMemoryBuilder', () => {
  it('builds raw memories with source evidence and is repeatable', async () => {
    const resource = {
      id: 'resource-1',
      title: 'Research note',
      type: 'note' as const,
      sourceUrl: null,
      content: 'First paragraph.\n\nSecond paragraph.',
      contentHash: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const resourceRepository: ResourceRepository = {
      list: async () => [resource],
      findById: async () => resource,
      create: async () => resource,
    };
    const calls: string[] = [];
    const memoryRepository: MemoryRepository = {
      replaceRawChunks: async (resourceId, chunks) => {
        calls.push(resourceId);
        return chunks.map((chunk) =>
          memoryRecord(resourceId, chunk.chunkIndex, chunk.content),
        );
      },
    };
    const builder = new ResourceMemoryBuilder(
      new DefaultResourceService(resourceRepository),
      memoryRepository,
    );

    const first = await builder.rebuild({ maxCharacters: 12, overlapCharacters: 2 });
    const second = await builder.rebuild({ maxCharacters: 12, overlapCharacters: 2 });

    expect(first.resourcesProcessed).toBe(1);
    expect(first.chunksCreated).toBeGreaterThan(1);
    expect(first.memories.every((memory) => memory.provenance === 'verified')).toBe(true);
    expect(first.memories.every((memory) => memory.evidenceText !== null)).toBe(true);
    expect(second.chunksCreated).toBe(first.chunksCreated);
    expect(calls).toEqual(['resource-1', 'resource-1']);
  });

  it('rebuilds only requested resources', async () => {
    const resources = ['one', 'two'].map((id) => ({
      id,
      title: id,
      type: 'note' as const,
      sourceUrl: null,
      content: `Content for ${id}`,
      contentHash: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
    const firstResource = resources[0]!;
    const repository: ResourceRepository = {
      list: async () => resources,
      findById: async (id) => resources.find((resource) => resource.id === id) ?? null,
      create: async () => firstResource,
    };
    const processed: string[] = [];
    const memoryRepository: MemoryRepository = {
      replaceRawChunks: async (resourceId, chunks) => {
        processed.push(resourceId);
        return chunks.map((chunk) => memoryRecord(resourceId, chunk.chunkIndex, chunk.content));
      },
    };

    const result = await new ResourceMemoryBuilder(
      new DefaultResourceService(repository),
      memoryRepository,
    ).rebuild({ resourceIds: ['two'] });

    expect(result.resourcesProcessed).toBe(1);
    expect(processed).toEqual(['two']);
  });
});
