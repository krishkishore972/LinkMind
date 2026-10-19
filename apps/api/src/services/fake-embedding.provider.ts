import type { EmbeddingProvider } from './embedding.provider.js';

export class FakeEmbeddingProvider implements EmbeddingProvider {
  public readonly model = 'fake-embedding-model';
  public readonly dimensions = 1536;

  public async embed(texts: readonly string[]): Promise<number[][]> {
    return texts.map((text) => this.hashToVector(text));
  }

  public async embedSingle(text: string): Promise<number[]> {
    return this.hashToVector(text);
  }

  private hashToVector(text: string): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    const vec = new Array(this.dimensions);
    let seed = Math.abs(hash);
    for (let i = 0; i < this.dimensions; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      vec[i] = (seed / 0xffffffff) * 2 - 1;
    }

    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map((v) => v / (norm || 1));
  }
}

export function createFakeEmbeddingProvider(): EmbeddingProvider {
  return new FakeEmbeddingProvider();
}