import { db } from '@repo/db';
import { resourceRepository } from './resource.repository.js';
import type { SearchDocument } from '../types/search.js';

export interface MemorySearchRepository {
  listRawDocuments(): Promise<readonly SearchDocument[]>;
  listRawDocumentsByIds(memoryIds: readonly string[]): Promise<readonly SearchDocument[]>;
}

export const memorySearchRepository: MemorySearchRepository = {
  async listRawDocuments(): Promise<readonly SearchDocument[]> {
    const memories = await db.orm.public.MemoryItem
      .where({ representation: 'raw' })
      .all();

    const documents: SearchDocument[] = [];
    for (const memory of memories) {
      const resource = await resourceRepository.findById(memory.resourceId);
      if (!resource) {
        continue;
      }

      documents.push({
        memoryId: memory.id,
        resourceId: memory.resourceId,
        resourceTitle: resource.title,
        sourceUrl: resource.sourceUrl,
        content: memory.content,
        evidenceText: memory.evidenceText,
      });
    }

    return documents;
  },

  async listRawDocumentsByIds(memoryIds: readonly string[]): Promise<readonly SearchDocument[]> {
    if (memoryIds.length === 0) {
      return [];
    }

    const idSet = new Set(memoryIds);
    const memories = await db.orm.public.MemoryItem.where({ representation: 'raw' }).all();
    const filtered = memories.filter((m) => idSet.has(m.id));

    const documents: SearchDocument[] = [];
    for (const memory of filtered) {
      const resource = await resourceRepository.findById(memory.resourceId);
      if (!resource) {
        continue;
      }

      documents.push({
        memoryId: memory.id,
        resourceId: memory.resourceId,
        resourceTitle: resource.title,
        sourceUrl: resource.sourceUrl,
        content: memory.content,
        evidenceText: memory.evidenceText,
      });
    }

    return documents;
  },
};
