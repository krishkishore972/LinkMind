import type { MemoryRepository } from '../repositories/memory.repository.js';
import type { ResourceService } from './resource.service.js';
import type { EmbeddingProvider } from './embedding.provider.js';
import { vectorRepository } from '../repositories/vector.repository.js';
import type { MemoryItemRecord } from '../types/memory.js';

export interface SummaryBuilderOptions {
  resourceIds?: readonly string[];
  batchSize?: number;
}

export interface SummaryBuilderResult {
  resourcesProcessed: number;
  summariesCreated: number;
  embeddingsCreated: number;
  errors: string[];
}

interface SummaryInput {
  resourceId: string;
  content: string;
  evidenceText: string;
  evidenceStart: number;
  evidenceEnd: number;
}

export class SummaryBuilder {
  public constructor(
    private readonly resourceService: ResourceService,
    private readonly memoryRepository: MemoryRepository,
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  public async build(options: SummaryBuilderOptions = {}): Promise<SummaryBuilderResult> {
    const batchSize = options.batchSize ?? 5;
    const errors: string[] = [];
    let resourcesProcessed = 0;
    let summariesCreated = 0;
    let embeddingsCreated = 0;

    const resources = options.resourceIds
      ? await Promise.all(
          options.resourceIds.map((id) => this.resourceService.findById(id)),
        ).then((items) => items.filter((item): item is NonNullable<typeof item> => item !== null))
      : await this.resourceService.list();

    for (const resource of resources) {
      try {
        const summaries = this.generateSummaries(resource);
        resourcesProcessed++;

        const memories = [];
        for (const summary of summaries) {
          memories.push(await this.memoryRepository.createSummary(summary));
          summariesCreated++;
        }

        for (let start = 0; start < memories.length; start += batchSize) {
          const batch = memories.slice(start, start + batchSize);
          const embeddings = await this.embeddingProvider.embed(batch.map((memory) => memory.content));
          await vectorRepository.saveEmbeddings(batch.map((memory, index) => ({
            id: memory.id,
            embedding: embeddings[index]!,
          })));
          embeddingsCreated += batch.length;
        }
      } catch (error) {
        errors.push(`Resource ${resource.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { resourcesProcessed, summariesCreated, embeddingsCreated, errors };
  }

  private generateSummaries(resource: { id: string; content: string; title: string }): SummaryInput[] {
    // Simple extractive summarization: split into paragraphs, take first N sentences
    const paragraphs = resource.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 50);

    const summaries: SummaryInput[] = [];
    let evidenceStart = 0;

    for (const paragraph of paragraphs) {
      const sentences = this.splitSentences(paragraph);
      const summaryContent = sentences.slice(0, 3).join(' ');

      if (summaryContent.length > 100) {
        summaries.push({
          resourceId: resource.id,
          content: summaryContent,
          evidenceText: paragraph,
          evidenceStart,
          evidenceEnd: evidenceStart + paragraph.length,
        });
      }
      evidenceStart += paragraph.length + 2; // +2 for \n\n
    }

    // Always include a full-document summary
    if (resource.content.length > 500) {
      const sentences = this.splitSentences(resource.content);
      const fullSummary = sentences.slice(0, 5).join(' ');
      summaries.push({
        resourceId: resource.id,
        content: fullSummary,
        evidenceText: resource.content.slice(0, 1000),
        evidenceStart: 0,
        evidenceEnd: Math.min(1000, resource.content.length),
      });
    }

    return summaries;
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }
}

function generateId(): string {
  return crypto.randomUUID();
}
