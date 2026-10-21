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

    for (let start = 0; start < texts.length; start += 10) {
      const batch = texts.slice(start, start + 10);
      const response = await this.embedWithRetry(batch);
      const embeddings = response.embeddings?.map((embedding) => embedding.values).filter(
        (embedding): embedding is number[] => Array.isArray(embedding),
      ) ?? [];

      if (embeddings.length !== batch.length) {
        throw new Error(`Gemini API returned ${embeddings.length} embeddings for ${batch.length} inputs`);
      }
      allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
  }

  public async embedSingle(text: string): Promise<number[]> {
    const response = await this.embedWithRetry([text]);

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('Gemini API returned no embedding');
    }
    return embedding;
  }

  private async embedWithRetry(texts: readonly string[]): Promise<Awaited<ReturnType<typeof this.client.models.embedContent>>> {
    let delayMs = 1000;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await this.client.models.embedContent({
          model: this.model,
          contents: texts.map((text) => ({
            role: 'user',
            parts: [{ text }],
          })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = /429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(message);
        if (!retryable || attempt === 3) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new Error('Gemini embedding request failed after retries');
  }
}

export function createGeminiEmbeddingProvider(
  apiKey: string,
  model: 'text-embedding-004' | 'text-embedding-004-1536' | 'gemini-embedding-2' = 'gemini-embedding-2',
): import('./embedding.provider.js').EmbeddingProvider {
  return new GeminiEmbeddingProvider(apiKey, model);
}
