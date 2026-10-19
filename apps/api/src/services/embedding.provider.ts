export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;

  embed(texts: readonly string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
}

export interface EmbeddingProviderConfig {
  model?: string;
  dimensions?: number;
}