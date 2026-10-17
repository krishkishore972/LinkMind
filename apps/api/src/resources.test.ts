import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import type { ResourceRecord } from './types/resource.js';
import type { ResourceService } from './services/resource.service.js';

const resource: ResourceRecord = {
  id: 'resource-1',
  title: 'A research note',
  type: 'note',
  sourceUrl: null,
  content: 'LinkMind preserves evidence.',
  contentHash: 'hash',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function service(): ResourceService {
  return {
    list: async () => [resource],
    findById: async (id) => (id === resource.id ? resource : null),
    create: async (input) => ({
      ...resource,
      title: input.title,
      type: input.type,
      sourceUrl: input.sourceUrl ?? null,
      content: input.content,
    }),
  };
}

describe('resource routes', () => {
  it('lists resources', async () => {
    const response = await request(createApp({ resourceService: service() }))
      .get('/api/resources');

    expect(response.status).toBe(200);
    expect(response.body.resources).toHaveLength(1);
    expect(response.body.resources[0].id).toBe(resource.id);
  });

  it('creates a valid resource', async () => {
    const response = await request(createApp({ resourceService: service() }))
      .post('/api/resources')
      .send({
        title: 'New note',
        type: 'note',
        content: 'Evidence text',
      });

    expect(response.status).toBe(201);
    expect(response.body.resource.title).toBe('New note');
  });

  it('rejects invalid resource input', async () => {
    const response = await request(createApp({ resourceService: service() }))
      .post('/api/resources')
      .send({ title: '', type: 'invalid', content: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });

  it('returns a resource by id', async () => {
    const response = await request(createApp({ resourceService: service() }))
      .get(`/api/resources/${resource.id}`);

    expect(response.status).toBe(200);
    expect(response.body.resource.id).toBe(resource.id);
  });

  it('returns 404 for an unknown resource', async () => {
    const response = await request(createApp({ resourceService: service() }))
      .get('/api/resources/missing');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('resource_not_found');
  });
});
