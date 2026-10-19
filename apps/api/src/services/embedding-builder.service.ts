import type { EmbeddingProvider } from './embedding.provider.js';
import type { MemoryRepository } from '../repositories/memory.repository.js';
import { vectorRepository } from '../repositories/vector.repository.js';
import type { MemoryItemRecord } from '../types/memory.js';

export interface EmbeddingBuilderOptions {
  resourceIds?: readonly string[];
  representations?: readonly ('raw' | 'summary' | 'fact')[];
  batchSize?: number;
}

export interface EmbeddingBuilderResult {
  itemsProcessed: number;
  embeddingsCreated: number;
  errors: string[];
}

interface MemoryItemForEmbedding {
  id: string;
  content: string;
  embedding: number[] | null;
}

export class EmbeddingBuilder {
  public constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly provider: EmbeddingProvider,
  ) {}

  public async build(
    options: EmbeddingBuilderOptions = {},
  ): Promise<EmbeddingBuilderResult> {
    const representations = options.representations ?? ['raw'];
    const batchSize = options.batchSize ?? 10;
    const errors: string[] = [];
    let itemsProcessed = 0;
    let embeddingsCreated = 0;

    for (const representation of representations) {
      const memories = await this.memoryRepository.findByRepresentation(
        representation,
        options.resourceIds,
      );

      if (memories.length === 0) {
        continue;
      }

      const withoutEmbedding = memories.filter((m) => m.embedding === null);
      itemsProcessed += withoutEmbedding.length;

      for (let i = 0; i < withoutEmbedding.length; i += batchSize) {
        const batch = withoutEmbedding.slice(i, i + batchSize);
        const texts = batch.map((m) => m.content);

        try {
          const embeddings = await this.provider.embed(texts);
          const toSave = batch.map((memory, idx) => ({
            id: memory.id,
            embedding: embeddings[idx]!,
          }));

          await vectorRepository.saveEmbeddings(toSave);
          embeddingsCreated += toSave.length;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Batch ${i / batchSize + 1} failed: ${message}`);
        }
      }
    }

    return { itemsProcessed, embeddingsCreated, errors };
  }
}