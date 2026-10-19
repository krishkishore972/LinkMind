import type { MemoryRepository } from '../repositories/memory.repository.js';
import type { ResourceService } from './resource.service.js';
import type { EmbeddingProvider } from './embedding.provider.js';
import { vectorRepository } from '../repositories/vector.repository.js';
import type { MemoryItemRecord, FactMemoryInput } from '../types/memory.js';

export interface FactBuilderOptions {
  resourceIds?: readonly string[];
  batchSize?: number;
}

export interface FactBuilderResult {
  resourcesProcessed: number;
  factsCreated: number;
  embeddingsCreated: number;
  errors: string[];
}

interface FactCandidate {
  subject: string;
  predicate: string;
  object: string;
  content: string;
  evidenceText: string;
  evidenceStart: number;
  evidenceEnd: number;
  entities: string[];
}

export class FactBuilder {
  public constructor(
    private readonly resourceService: ResourceService,
    private readonly memoryRepository: MemoryRepository,
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  public async build(options: FactBuilderOptions = {}): Promise<FactBuilderResult> {
    const batchSize = options.batchSize ?? 5;
    const errors: string[] = [];
    let resourcesProcessed = 0;
    let factsCreated = 0;
    let embeddingsCreated = 0;

    const resources = options.resourceIds
      ? await Promise.all(
          options.resourceIds.map((id) => this.resourceService.findById(id)),
        ).then((items) => items.filter((item): item is NonNullable<typeof item> => item !== null))
      : await this.resourceService.list();

    for (const resource of resources) {
      try {
        const factCandidates = this.extractFacts(resource);
        resourcesProcessed++;

        for (const candidate of factCandidates) {
          const factInput: FactMemoryInput = {
            resourceId: resource.id,
            content: candidate.content,
            evidenceText: candidate.evidenceText,
            evidenceStart: candidate.evidenceStart,
            evidenceEnd: candidate.evidenceEnd,
            entities: candidate.entities,
            predicate: candidate.predicate,
            subject: candidate.subject,
            object: candidate.object,
          };

          const memory = await this.memoryRepository.createFact(factInput);
          const embedding = await this.embeddingProvider.embedSingle(candidate.content);
          await vectorRepository.saveEmbeddings([{ id: memory.id, embedding }]);

          factsCreated++;
          // Note: embedding count tracked separately
        }
      } catch (error) {
        errors.push(`Resource ${resource.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { resourcesProcessed, factsCreated, embeddingsCreated, errors };
  }

  private extractFacts(resource: { id: string; content: string; title: string }): FactCandidate[] {
    const facts: FactCandidate[] = [];
    const sentences = this.splitSentences(resource.content);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;
      const extracted = this.extractFactFromSentence(sentence, resource.title);

      if (extracted) {
        const evidenceStart = resource.content.indexOf(sentence);
        facts.push({
          subject: extracted.subject,
          predicate: extracted.predicate,
          object: extracted.object,
          content: `${extracted.subject} ${extracted.predicate} ${extracted.object}`,
          evidenceText: sentence,
          evidenceStart: resource.content.indexOf(sentence),
          evidenceEnd: resource.content.indexOf(sentence) + sentence.length,
          entities: [extracted.subject, extracted.object].filter(Boolean),
        });
      }
    }

    return facts;
  }

  private extractFactFromSentence(sentence: string, title: string): { subject: string; predicate: string; object: string } | null {
    if (!sentence) return null;

    // Simple pattern-based fact extraction
    // Pattern: "X is Y" or "X has Y" or "X uses Y" etc.
    const patterns = [
      /^(.+?)\s+(is|are|was|were)\s+(.+?)[.!?]/i,
      /^(.+?)\s+(has|have|had)\s+(.+?)[.!?]/i,
      /^(.+?)\s+(uses|use|used)\s+(.+?)[.!?]/i,
      /^(.+?)\s+(implements|implement|implemented)\s+(.+?)[.!?]/i,
      /^(.+?)\s+(supports|support|supported)\s+(.+?)[.!?]/i,
      /^(.+?)\s+(provides|provide|provided)\s+(.+?)[.!?]/i,
    ];

    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match && match[1] && match[2] && match[3]) {
        const subject = match[1];
        const predicate = match[2];
        const object = match[3];
        if (subject.length > 2 && object.length > 2) {
          return { subject: subject.trim(), predicate: predicate.trim(), object: object.trim() };
        }
      }
    }

    // Fallback: use title as subject for first sentence
    if (sentence.includes(' is ') || sentence.includes(' has ') || sentence.includes(' uses ')) {
      const parts = sentence.split(/\s+(is|has|uses)\s+/i);
      if (parts.length >= 3) {
        const subject = parts[0]?.trim();
        const predicate = parts[1]?.trim();
        const object = parts[2]?.replace(/[.!?]/g, '').trim();
        if (subject && predicate && object) {
          return { subject, predicate, object };
        }
      }
    }

    return null;
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 500);
  }
}