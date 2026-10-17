import { z } from 'zod';

export const resourceTypeSchema = z.enum([
  'note',
  'webpage',
  'youtube_transcript',
  'github_readme',
  'paper_excerpt',
  'other',
]);

export type ResourceType = z.infer<typeof resourceTypeSchema>;

export type ResourceRecord = {
  id: string;
  title: string;
  type: ResourceType;
  sourceUrl: string | null;
  content: string;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateResourceInput = {
  title: string;
  type: ResourceType;
  sourceUrl?: string;
  content: string;
};

export type PersistResourceInput = CreateResourceInput & {
  contentHash: string;
};
