import type { EmbeddingProvider } from './embedding.provider.js';
import { GoogleGenAI } from '@google/genai';

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  public readonly model: string;
  public readonly dimensions: number;

  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    model: 'text-embedding-004' | 'text-embedding-004-1536' | 'gemini-embedding-2' = 'gemini-embedding-2',
  ) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
    this.dimensions = model === 'text-embedding-004' ? 768 : model === 'text-embedding-004-1536' ? 1536 : 3072;
  }

  public async embed(texts: readonly string[]): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (const text of texts) {
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: text,
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error('Gemini API returned no embedding');
      }
      allEmbeddings.push(embedding);
    }

    return allEmbeddings;
  }

  public async embedSingle(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.model,
      contents: text,
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('Gemini API returned no embedding');
    }
    return embedding;
  }
}

export function createGeminiEmbeddingProvider(
  apiKey: string,
  model: 'text-embedding-004' | 'text-embedding-004-1536' | 'gemini-embedding-2' = 'gemini-embedding-2',
): import('./embedding.provider.js').EmbeddingProvider {
  return new GeminiEmbeddingProvider(apiKey, model);
}