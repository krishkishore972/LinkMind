import type { EmbeddingProvider } from './embedding.provider.js';

export class FakeEmbeddingProvider implements EmbeddingProvider {
  public readonly model = 'fake-embedding-model';
  public readonly dimensions = 3072;

  public async embed(texts: readonly string[]): Promise<number[][]> {
    return texts.map((text) => this.hashToVector(text));
  }

  public async embedSingle(text: string): Promise<number[]> {
    return this.hashToVector(text);
  }

  private hashToVector(text: string): number[] {
    const tokens = tokenize(text);
    const vec = new Array<number>(this.dimensions).fill(0);

    for (const token of tokens) {
      const index = hashToken(token, this.dimensions);
      vec[index] = (vec[index] ?? 0) + 1;
    }

    for (let index = 1; index < tokens.length; index += 1) {
      const bigram = `${tokens[index - 1]}:${tokens[index]}`;
      const vectorIndex = hashToken(bigram, this.dimensions);
      vec[vectorIndex] = (vec[vectorIndex] ?? 0) + 0.5;
    }

    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map((v) => v / (norm || 1));
  }
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this',
  'to', 'use', 'what', 'with',
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => !STOP_WORDS.has(token)) ?? [];
}

function hashToken(token: string, dimensions: number): number {
  let hash = 2166136261;
  for (const character of token) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % dimensions;
}

export function createFakeEmbeddingProvider(): EmbeddingProvider {
  return new FakeEmbeddingProvider();
}
