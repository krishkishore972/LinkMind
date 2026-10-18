import { db } from '@repo/db';
import type {
  PersistResourceInput,
  ResourceRecord,
} from '../types/resource.js';

export interface ResourceRepository {
  list(): Promise<readonly ResourceRecord[]>;
  findById(id: string): Promise<ResourceRecord | null>;
  create(input: PersistResourceInput): Promise<ResourceRecord>;
}

function toResourceRecord(resource: ResourceRecord): ResourceRecord {
  return resource;
}

export const resourceRepository: ResourceRepository = {
  async list(): Promise<readonly ResourceRecord[]> {
    const resources = await db.orm.public.Resource.orderBy((resource) =>
      resource.createdAt.desc(),
    ).all();
    return resources.map(toResourceRecord);
  },

  async findById(id: string): Promise<ResourceRecord | null> {
    const resource = await db.orm.public.Resource.first({ id });
    return resource ? toResourceRecord(resource) : null;
  },

  async create(input: PersistResourceInput): Promise<ResourceRecord> {
    const resource = await db.orm.public.Resource.create({
      id: input.id,
      title: input.title,
      type: input.type,
      sourceUrl: input.sourceUrl ?? null,
      content: input.content,
      contentHash: input.contentHash,
    });
    return toResourceRecord(resource);
  },
};
