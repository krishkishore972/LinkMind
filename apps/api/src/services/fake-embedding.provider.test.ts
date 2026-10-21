import { describe, expect, it } from 'vitest';
import { createFakeEmbeddingProvider } from './fake-embedding.provider.js';

function cosine(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * right[index]!, 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return dot / (leftMagnitude * rightMagnitude);
}

describe('FakeEmbeddingProvider', () => {
  it('keeps related text closer than unrelated text for offline demos', async () => {
    const provider = createFakeEmbeddingProvider();
    const [query, related, unrelated] = await provider.embed([
      'What is caching?',
      'Caching stores generated embeddings so repeated queries are faster.',
      'Graph edges connect related facts across resources.',
    ]);

    expect(provider.dimensions).toBe(3072);
    expect(cosine(query!, related!)).toBeGreaterThan(cosine(query!, unrelated!));
  });
});
