import { db } from '@repo/db';
import type {
  MemoryItemRecord,
  RawMemoryChunkInput,
} from '../types/memory.js';

export interface MemoryRepository {
  replaceRawChunks(
    resourceId: string,
    chunks: readonly RawMemoryChunkInput[],
  ): Promise<readonly MemoryItemRecord[]>;
}

function toMemoryItemRecord(item: MemoryItemRecord): MemoryItemRecord {
  return item;
}

export const memoryRepository: MemoryRepository = {
  async replaceRawChunks(
    resourceId: string,
    chunks: readonly RawMemoryChunkInput[],
  ): Promise<readonly MemoryItemRecord[]> {
    await db.orm.public.MemoryItem
      .where({ resourceId, representation: 'raw' })
      .deleteAll();

    const memories: MemoryItemRecord[] = [];
    for (const chunk of chunks) {
      const memory = await db.orm.public.MemoryItem.create({
        resourceId,
        representation: 'raw',
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        evidenceText: chunk.evidenceText,
        evidenceStart: chunk.evidenceStart,
        evidenceEnd: chunk.evidenceEnd,
        provenance: 'verified',
        metadata: {
          source: 'resource-content',
          normalization: 'whitespace-collapse',
        },
      });
      memories.push(toMemoryItemRecord(memory));
    }

    return memories;
  },
};
