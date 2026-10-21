import type { LLMProvider, GenerateOptions, CitationSource, CitedResponse } from './llm.provider.js';

export class FakeLLMProvider implements LLMProvider {
  public readonly model = 'fake-llm-model';
  public readonly maxTokens = 4096;

  public async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    // Deterministic response based on prompt hash
    const hash = this.hashString(prompt);
    const responses: readonly string[] = [
      'Based on the provided sources, the answer is that pgvector is a PostgreSQL extension for vector similarity search.',
      'According to the retrieved documents, pgvector adds vector data types and similarity search operators to PostgreSQL.',
      'The sources indicate that pgvector supports both HNSW and IVFFlat indexes for approximate nearest neighbor search.',
      'Based on the evidence, pgvector enables semantic search and RAG applications directly in PostgreSQL.',
    ];
    const index = hash % responses.length;
    return responses[index] as string;
  }

  public async generateWithCitations(prompt: string, sources: CitationSource[]): Promise<CitedResponse> {
    if (sources.length === 0) {
      return {
        answer: 'I cannot answer this question as no relevant sources were found.',
        citations: [],
        abstained: true,
      };
    }

    // Simple deterministic answer synthesis
    const hash = this.hashString(prompt);
    const templates: readonly ((s: CitationSource[]) => string)[] = [
      (s: CitationSource[]) => `Based on the provided sources, pgvector is a PostgreSQL extension that adds vector similarity search capabilities. It supports exact and approximate nearest neighbor search with HNSW and IVFFlat indexes.`,
      (s: CitationSource[]) => `According to the retrieved documents, pgvector adds vector data types and similarity search operators to PostgreSQL, enabling semantic search and RAG applications.`,
      (s: CitationSource[]) => `The sources indicate that pgvector enables storing embeddings with up to 16,000 dimensions and provides cosine similarity, inner product, and L2 distance operators.`,
    ];

    const templateFn = templates[hash % templates.length]!;
    const answer = templateFn(sources);

    // Generate simple citations - cite the first 2 sources
    const citations = sources.slice(0, 2).map((source, index) => ({
      memoryId: source.memoryId,
      resourceId: source.resourceId,
      resourceTitle: source.resourceTitle,
      evidenceText: source.evidenceText,
      startIndex: index * 50,
      endIndex: (index + 1) * 50,
    }));

    return {
      answer,
      citations,
      abstained: false,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export function createFakeLLMProvider(): LLMProvider {
  return new FakeLLMProvider();
}