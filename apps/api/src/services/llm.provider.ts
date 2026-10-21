export interface LLMProvider {
  readonly model: string;
  readonly maxTokens: number;

  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateWithCitations(prompt: string, sources: CitationSource[]): Promise<CitedResponse>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface CitationSource {
  memoryId: string;
  resourceId: string;
  resourceTitle: string;
  content: string;
  evidenceText: string;
  score: number;
  rank: number;
}

export interface CitedResponse {
  answer: string;
  citations: Array<{
    memoryId: string;
    resourceId: string;
    resourceTitle: string;
    evidenceText: string;
    startIndex: number;
    endIndex: number;
  }>;
  abstained: boolean;
}