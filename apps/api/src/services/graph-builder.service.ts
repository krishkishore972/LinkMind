import type { MemoryRepository } from '../repositories/memory.repository.js';
import type { FactMemoryInput } from '../types/memory.js';

export interface GraphEdgeInput {
  sourceMemoryId: string;
  targetMemoryId: string;
  relation: 'related_to' | 'supports' | 'contradicts' | 'derived_from' | 'same_entity';
  confidence?: number;
  evidenceText?: string;
  provenance?: 'verified' | 'generated' | 'unverified';
}

export interface GraphBuilderOptions {
  resourceIds?: readonly string[];
}

export interface GraphBuilderResult {
  edgesCreated: number;
  factsLinked: number;
  errors: string[];
}

export class GraphBuilder {
  public constructor(private readonly memoryRepository: MemoryRepository) {}

  public async build(options: GraphBuilderOptions = {}): Promise<GraphBuilderResult> {
    const errors: string[] = [];
    let edgesCreated = 0;
    let factsLinked = 0;

    const factMemories = await this.memoryRepository.findByRepresentation('fact', options.resourceIds);

    // Build edges based on shared entities
    for (let i = 0; i < factMemories.length; i++) {
      const factA = factMemories[i];
      if (!factA) continue;
      const entitiesA = this.getEntities(factA);

      for (let j = i + 1; j < factMemories.length; j++) {
        const factB = factMemories[j];
        if (!factB) continue;
        const entitiesB = this.getEntities(factB);

        // Same entity - strong link
        const sharedEntities = entitiesA.filter((e) => entitiesB.includes(e));
        if (sharedEntities.length > 0) {
          await this.createEdge(factA.id, factB.id, 'same_entity', 0.9, `Shared entities: ${sharedEntities.join(', ')}`);
          edgesCreated++;
          factsLinked += 2;
        }

        // Related entities - weaker link
        if (this.areRelated(entitiesA, entitiesB)) {
          await this.createEdge(factA.id, factB.id, 'related_to', 0.5, 'Related entities');
          edgesCreated++;
        }
      }
    }

    return { edgesCreated, factsLinked, errors: [] };
  }

  private async createEdge(
    sourceId: string,
    targetId: string,
    relation: 'related_to' | 'supports' | 'contradicts' | 'derived_from' | 'same_entity',
    confidence: number,
    evidenceText: string,
  ): Promise<void> {
    // This would use a GraphEdgeRepository - for now we'll skip actual DB insert
    // In a full implementation, this would call graphEdgeRepository.create({...})
  }

  private getEntities(memory: { metadata?: unknown }): string[] {
    const metadata = memory.metadata as Record<string, unknown> | undefined;
    if (!metadata) return [];

    const entities = metadata.entities as string[] | undefined;
    if (Array.isArray(entities)) return entities;

    const subject = metadata.subject as string | undefined;
    const object = metadata.object as string | undefined;
    return [subject, object].filter(Boolean) as string[];
  }

  private areRelated(entitiesA: string[], entitiesB: string[]): boolean {
    // Check if entities are semantically related (simplified)
    // In a full implementation, this would use an ontology or embedding similarity
    return entitiesA.some((a) => entitiesB.some((b) => this.similar(a, b)));
  }

  private similar(a: string, b: string): boolean {
    // Simple string similarity check
    if (a === b) return true;
    // Check if one contains the other
    if (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())) {
      return true;
    }
    return false;
  }
}