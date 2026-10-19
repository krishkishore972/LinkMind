export type MemoryRepresentation = 'raw' | 'summary' | 'fact';
export type ProvenanceStatus = 'verified' | 'generated' | 'unverified';

export type MemoryItemRecord = {
  id: string;
  resourceId: string;
  representation: MemoryRepresentation;
  chunkIndex: number | null;
  content: string;
  evidenceText: string | null;
  evidenceStart: number | null;
  evidenceEnd: number | null;
  provenance: ProvenanceStatus;
  metadata: unknown;
  embedding: number[] | null;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RawMemoryChunkInput = {
  resourceId: string;
  chunkIndex: number;
  content: string;
  evidenceText: string;
  evidenceStart: number;
  evidenceEnd: number;
};

export type MemoryRebuildResult = {
  resourcesProcessed: number;
  chunksCreated: number;
  memories: readonly MemoryItemRecord[];
};
