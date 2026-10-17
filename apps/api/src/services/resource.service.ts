import { createHash } from 'node:crypto';
import type { ResourceRepository } from '../repositories/resource.repository.js';
import type {
  CreateResourceInput,
  ResourceRecord,
} from '../types/resource.js';

export interface ResourceService {
  list(): Promise<readonly ResourceRecord[]>;
  findById(id: string): Promise<ResourceRecord | null>;
  create(input: CreateResourceInput): Promise<ResourceRecord>;
}

export class DefaultResourceService implements ResourceService {
  public constructor(private readonly repository: ResourceRepository) {}

  public list(): Promise<readonly ResourceRecord[]> {
    return this.repository.list();
  }

  public findById(id: string): Promise<ResourceRecord | null> {
    return this.repository.findById(id);
  }

  public create(input: CreateResourceInput): Promise<ResourceRecord> {
    const contentHash = createHash('sha256')
      .update(input.content)
      .digest('hex');

    return this.repository.create({ ...input, contentHash });
  }
}
