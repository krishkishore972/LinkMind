import { db } from '@repo/db';

export type GraphEdgeRecord = {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relation: 'related_to' | 'supports' | 'contradicts' | 'derived_from' | 'same_entity';
  confidence: number | null;
  provenance: 'verified' | 'generated' | 'unverified';
  evidenceText: string | null;
};

export interface GraphEdgeRepository {
  listAll(): Promise<readonly GraphEdgeRecord[]>;
  createIfMissing(input: Omit<GraphEdgeRecord, 'id'>): Promise<GraphEdgeRecord>;
  deleteForMemoryIds(memoryIds: readonly string[]): Promise<void>;
}

export const graphEdgeRepository: GraphEdgeRepository = {
  async listAll(): Promise<readonly GraphEdgeRecord[]> {
    return db.orm.public.MemoryEdge.all();
  },

  async createIfMissing(input): Promise<GraphEdgeRecord> {
    const existing = await db.orm.public.MemoryEdge.first({
      sourceMemoryId: input.sourceMemoryId,
      targetMemoryId: input.targetMemoryId,
      relation: input.relation,
    });
    if (existing) return existing;

    return db.orm.public.MemoryEdge.create({
      sourceMemoryId: input.sourceMemoryId,
      targetMemoryId: input.targetMemoryId,
      relation: input.relation,
      confidence: input.confidence,
      provenance: input.provenance,
      evidenceText: input.evidenceText,
    });
  },

  async deleteForMemoryIds(memoryIds): Promise<void> {
    for (const memoryId of memoryIds) {
      await db.orm.public.MemoryEdge.where({ sourceMemoryId: memoryId }).deleteAll();
      await db.orm.public.MemoryEdge.where({ targetMemoryId: memoryId }).deleteAll();
    }
  },
};
