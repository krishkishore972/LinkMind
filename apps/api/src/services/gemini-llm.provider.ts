import type { LLMProvider, GenerateOptions, CitationSource, CitedResponse } from './llm.provider.js';
import { GoogleGenAI } from '@google/genai';

export class GeminiLLMProvider implements LLMProvider {
  public readonly model: string;
  public readonly maxTokens: number;

  private readonly client: GoogleGenAI;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash', maxTokens: number = 4096) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  public async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const systemPrompt = options?.systemPrompt ?? 
      'You are a helpful assistant that answers questions based on provided sources. Always cite your sources.';

    const fullPrompt = `${systemPrompt}\n\nUser Query: ${prompt}`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: fullPrompt,
      config: {
        maxOutputTokens: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? 0.1,
      },
    });

    return response.text ?? '';
  }

  public async generateWithCitations(prompt: string, sources: CitationSource[]): Promise<CitedResponse> {
    if (sources.length === 0) {
      return {
        answer: 'I cannot answer this question as no relevant sources were found.',
        citations: [],
        abstained: true,
      };
    }

    // Build context from sources
    const context = sources
      .map((source, index) => {
        return `[Source ${index + 1}] (${source.resourceTitle}): ${source.evidenceText || source.content}`;
      })
      .join('\n\n');

    const systemPrompt = `You are a helpful assistant that answers questions based ONLY on the provided sources. 
You MUST cite your sources using [Source N] format where N is the source number.
If the sources do not contain enough information to answer the question, say so and set abstained to true.
Your response should be a JSON object with: answer, citations (array of {sourceNumber, memoryId, resourceId, evidenceText}), and abstained (boolean).`;

    const fullPrompt = `${systemPrompt}\n\nSources:\n${context}\n\nUser Query: ${prompt}\n\nRespond in JSON format only.`;

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: fullPrompt,
        config: {
          maxOutputTokens: this.maxTokens,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text ?? '{}';
      const parsed = JSON.parse(text);

      // Map citations to our format
      const citations = (parsed.citations || []).map((c: { sourceNumber?: number }) => {
        const sourceIndex = (c.sourceNumber || 1) - 1;
        const source = sources[sourceIndex];
        return {
          memoryId: source?.memoryId || '',
          resourceId: source?.resourceId || '',
          resourceTitle: source?.resourceTitle || '',
          evidenceText: source?.evidenceText || source?.content || '',
          startIndex: 0,
          endIndex: 0,
        };
      }).filter((c: { memoryId: string | undefined }): c is { memoryId: string } => c.memoryId != null);

      return {
        answer: parsed.answer || 'Unable to generate answer.',
        citations,
        abstained: parsed.abstained || false,
      };
    } catch (error) {
      // Fallback to simple generation
      const answer = await this.generate(prompt);
      return {
        answer,
        citations: sources.slice(0, 2).map((source, index) => ({
          memoryId: source.memoryId,
          resourceId: source.resourceId,
          resourceTitle: source.resourceTitle,
          evidenceText: source.evidenceText,
          startIndex: index * 50,
          endIndex: (index + 1) * 50,
        })),
        abstained: false,
      };
    }
  }
}

export function createGeminiLLMProvider(
  apiKey: string,
  model: string = 'gemini-2.0-flash',
  maxTokens: number = 4096
): LLMProvider {
  return new GeminiLLMProvider(apiKey, model, maxTokens);
}