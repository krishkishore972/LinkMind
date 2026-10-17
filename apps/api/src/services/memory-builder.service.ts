import type { MemoryRepository } from '../repositories/memory.repository.js';
import { chunkResource, type ChunkingOptions } from './chunking.service.js';
import type { ResourceService } from './resource.service.js';
import type {
  MemoryRebuildResult,
  RawMemoryChunkInput,
} from '../types/memory.js';

export type MemoryBuilderOptions = ChunkingOptions & {
  resourceIds?: readonly string[];
};

export class ResourceMemoryBuilder {
  public constructor(
    private readonly resources: ResourceService,
    private readonly memories: MemoryRepository,
  ) {}

  public async rebuild(
    options: MemoryBuilderOptions = {},
  ): Promise<MemoryRebuildResult> {
    const resources = options.resourceIds
      ? await Promise.all(
          options.resourceIds.map((id) => this.resources.findById(id)),
        ).then((items) => items.filter((item): item is NonNullable<typeof item> => item !== null))
      : await this.resources.list();

    const created = [];
    for (const resource of resources) {
      const chunks = chunkResource(resource.id, resource.content, options);
      const inputs: RawMemoryChunkInput[] = chunks.map((chunk) => ({
        resourceId: chunk.resourceId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        evidenceText: chunk.evidenceText,
        evidenceStart: chunk.evidenceStart,
        evidenceEnd: chunk.evidenceEnd,
      }));
      created.push(...(await this.memories.replaceRawChunks(resource.id, inputs)));
    }

    return {
      resourcesProcessed: resources.length,
      chunksCreated: created.length,
      memories: created,
    };
  }
}
