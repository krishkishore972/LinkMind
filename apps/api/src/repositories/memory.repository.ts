import { db } from '@repo/db';
import type {
  MemoryItemRecord,
  RawMemoryChunkInput,
  SummaryMemoryInput,
  FactMemoryInput,
} from '../types/memory.js';

export interface MemoryRepository {
  replaceRawChunks(
    resourceId: string,
    chunks: readonly RawMemoryChunkInput[],
  ): Promise<readonly MemoryItemRecord[]>;
  findByRepresentation(
    representation: 'raw' | 'summary' | 'fact',
    resourceIds?: readonly string[],
  ): Promise<readonly MemoryItemRecord[]>;
  createSummary(input: SummaryMemoryInput): Promise<MemoryItemRecord>;
  createFact(input: FactMemoryInput): Promise<MemoryItemRecord>;
  replaceSummaries(
    resourceId: string,
    summaries: readonly SummaryMemoryInput[],
  ): Promise<readonly MemoryItemRecord[]>;
  replaceFacts(
    resourceId: string,
    facts: readonly FactMemoryInput[],
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

  async findByRepresentation(
    representation: 'raw' | 'summary' | 'fact',
    resourceIds?: readonly string[],
  ): Promise<readonly MemoryItemRecord[]> {
    const memories = await db.orm.public.MemoryItem.where({ representation }).all();

    let filtered = memories;
    if (resourceIds && resourceIds.length > 0) {
      const idSet = new Set(resourceIds);
      filtered = memories.filter((m) => idSet.has(m.resourceId));
    }

    return filtered.map(toMemoryItemRecord);
  },

  async createSummary(input: SummaryMemoryInput): Promise<MemoryItemRecord> {
    const memory = await db.orm.public.MemoryItem.create({
      resourceId: input.resourceId,
      representation: 'summary',
      chunkIndex: null,
      content: input.content,
      evidenceText: input.evidenceText,
      evidenceStart: input.evidenceStart,
      evidenceEnd: input.evidenceEnd,
      provenance: 'generated',
      metadata: {
        source: 'summary-builder',
        normalization: 'extractive',
      },
    });
    return toMemoryItemRecord(memory);
  },

  async createFact(input: FactMemoryInput): Promise<MemoryItemRecord> {
    const memory = await db.orm.public.MemoryItem.create({
      resourceId: input.resourceId,
      representation: 'fact',
      chunkIndex: null,
      content: input.content,
      evidenceText: input.evidenceText,
      evidenceStart: input.evidenceStart,
      evidenceEnd: input.evidenceEnd,
      provenance: 'generated',
      metadata: {
        source: 'fact-builder',
        entities: input.entities,
        predicate: input.predicate,
        subject: input.subject,
        object: input.object,
      },
    });
    return toMemoryItemRecord(memory);
  },

  async replaceSummaries(
    resourceId: string,
    summaries: readonly SummaryMemoryInput[],
  ): Promise<readonly MemoryItemRecord[]> {
    await db.orm.public.MemoryItem
      .where({ resourceId, representation: 'summary' })
      .deleteAll();

    const memories: MemoryItemRecord[] = [];
    for (const summary of summaries) {
      const memory = await db.orm.public.MemoryItem.create({
        resourceId,
        representation: 'summary',
        chunkIndex: null,
        content: summary.content,
        evidenceText: summary.evidenceText,
        evidenceStart: summary.evidenceStart,
        evidenceEnd: summary.evidenceEnd,
        provenance: 'generated',
        metadata: {
          source: 'summary-builder',
          normalization: 'extractive',
        },
      });
      memories.push(toMemoryItemRecord(memory));
    }

    return memories;
  },

  async replaceFacts(
    resourceId: string,
    facts: readonly FactMemoryInput[],
  ): Promise<readonly MemoryItemRecord[]> {
    await db.orm.public.MemoryItem
      .where({ resourceId, representation: 'fact' })
      .deleteAll();

    const memories: MemoryItemRecord[] = [];
    for (const fact of facts) {
      const memory = await db.orm.public.MemoryItem.create({
        resourceId,
        representation: 'fact',
        chunkIndex: null,
        content: fact.content,
        evidenceText: fact.evidenceText,
        evidenceStart: fact.evidenceStart,
        evidenceEnd: fact.evidenceEnd,
        provenance: 'generated',
        metadata: {
          source: 'fact-builder',
          entities: fact.entities,
          predicate: fact.predicate,
          subject: fact.subject,
          object: fact.object,
        },
      });
      memories.push(toMemoryItemRecord(memory));
    }

    return memories;
  },
};
