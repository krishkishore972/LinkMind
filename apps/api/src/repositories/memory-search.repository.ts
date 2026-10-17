import { db } from '@repo/db';
import { resourceRepository } from './resource.repository.js';
import type { SearchDocument } from '../types/search.js';

export interface MemorySearchRepository {
  listRawDocuments(): Promise<readonly SearchDocument[]>;
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
        content: memory.content,
        evidenceText: memory.evidenceText,
      });
    }

    return documents;
  },
};
