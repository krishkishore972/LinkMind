import type { MemoryRepository } from '../repositories/memory.repository.js';
import { graphEdgeRepository, type GraphEdgeRepository } from '../repositories/graph-edge.repository.js';

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
  public constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly edgeRepository: GraphEdgeRepository = graphEdgeRepository,
  ) {}

  public async build(options: GraphBuilderOptions = {}): Promise<GraphBuilderResult> {
    const errors: string[] = [];
    let edgesCreated = 0;
    let factsLinked = 0;

    const allFactMemories = await this.memoryRepository.findByRepresentation('fact');
    const selectedResourceIds = options.resourceIds ? new Set(options.resourceIds) : null;
    const factMemories = selectedResourceIds
      ? allFactMemories.filter((fact) => selectedResourceIds.has(fact.resourceId))
      : allFactMemories;
    const factIds = factMemories.map((fact) => fact.id);
    await this.edgeRepository.deleteForMemoryIds(factIds);

    // When rebuilding selected resources, compare their facts against every
    // fact in the corpus so newly added resources can form cross-resource
    // links. Unselected-to-unselected edges remain untouched.
    const candidateFacts = selectedResourceIds ? allFactMemories : factMemories;

    // Build edges based on shared entities
    for (let i = 0; i < factMemories.length; i++) {
      const factA = factMemories[i];
      if (!factA) continue;
      const entitiesA = this.getEntities(factA);

      for (const factB of candidateFacts) {
        if (!factB) continue;
        if (factA.id === factB.id) continue;
        if ((!selectedResourceIds || selectedResourceIds.has(factB.resourceId)) && factB.id <= factA.id) continue;
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
    await this.edgeRepository.createIfMissing({
      sourceMemoryId: sourceId,
      targetMemoryId: targetId,
      relation,
      confidence,
      evidenceText,
      provenance: 'generated',
    });
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
