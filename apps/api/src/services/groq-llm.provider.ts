import type {
  CitationSource,
  CitedResponse,
  GenerateOptions,
  LLMProvider,
} from './llm.provider.js';

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

type ParsedCitationResponse = {
  answer?: unknown;
  citations?: unknown;
  abstained?: unknown;
};

const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqLLMProvider implements LLMProvider {
  public readonly model: string;
  public readonly maxTokens: number;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  public constructor(
    apiKey: string,
    model: string = DEFAULT_MODEL,
    maxTokens = 4096,
    baseUrl = DEFAULT_BASE_URL,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.baseUrl = baseUrl;
  }

  public async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const systemPrompt = options?.systemPrompt ??
      'You are a helpful assistant that answers questions based on provided sources. Always cite your sources.';
    const response = await this.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], options);
    return response;
  }

  public async generateWithCitations(
    prompt: string,
    sources: CitationSource[],
  ): Promise<CitedResponse> {
    if (sources.length === 0) {
      return {
        answer: 'I cannot answer this question as no relevant sources were found.',
        citations: [],
        abstained: true,
      };
    }

    const context = sources
      .map((source, index) =>
        `[Source ${index + 1}] (${source.resourceTitle}): ${source.evidenceText || source.content}`,
      )
      .join('\n\n');

    const systemPrompt = [
      'You answer questions using ONLY the supplied sources.',
      'If the sources do not support an answer, say that the evidence is insufficient and set abstained to true.',
      'Return JSON only with this shape: {"answer": string, "citations": [{"sourceNumber": number}], "abstained": boolean}.',
      'Use sourceNumber values that refer to the numbered sources below.',
    ].join(' ');

    try {
      const text = await this.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Sources:\n${context}\n\nQuestion: ${prompt}` },
      ], { temperature: 0.1, maxTokens: this.maxTokens, jsonMode: true });
      const parsed = parseJsonResponse(text);
      return toCitedResponse(parsed, sources);
    } catch {
      const answer = await this.generate(prompt);
      return {
        answer,
        citations: sources.slice(0, 2).map((source) => ({
          memoryId: source.memoryId,
          resourceId: source.resourceId,
          resourceTitle: source.resourceTitle,
          sourceUrl: source.sourceUrl,
          evidenceText: source.evidenceText || source.content,
          startIndex: 0,
          endIndex: 0,
        })),
        abstained: false,
      };
    }
  }

  private async complete(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    options?: GenerateOptions & { jsonMode?: boolean },
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? this.maxTokens,
    };
    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Groq request failed with ${response.status}: ${detail.slice(0, 500)}`);
    }

    const payload: unknown = await response.json();
    if (!isGroqChatResponse(payload)) {
      throw new Error('Groq response did not contain message content');
    }
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq response did not contain message content');
    }
    return content;
  }
}

function isGroqChatResponse(value: unknown): value is GroqChatResponse {
  return typeof value === 'object' && value !== null && 'choices' in value;
}

function parseJsonResponse(text: string): ParsedCitationResponse {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(cleaned);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Groq citation response was not an object');
  }
  return parsed as ParsedCitationResponse;
}

function toCitedResponse(parsed: ParsedCitationResponse, sources: CitationSource[]): CitedResponse {
  const citationValues = Array.isArray(parsed.citations) ? parsed.citations : [];
  const citations = citationValues.flatMap((value) => {
    if (typeof value !== 'object' || value === null || !('sourceNumber' in value)) {
      return [];
    }
    const sourceNumber = (value as { sourceNumber?: unknown }).sourceNumber;
    if (typeof sourceNumber !== 'number' || !Number.isInteger(sourceNumber)) {
      return [];
    }
    const source = sources[sourceNumber - 1];
    return source ? [{
      memoryId: source.memoryId,
      resourceId: source.resourceId,
      resourceTitle: source.resourceTitle,
      sourceUrl: source.sourceUrl,
      evidenceText: source.evidenceText || source.content,
      startIndex: 0,
      endIndex: 0,
    }] : [];
  });

  return {
    answer: typeof parsed.answer === 'string' ? parsed.answer : 'Unable to generate answer.',
    citations,
    abstained: parsed.abstained === true,
  };
}

export function createGroqLLMProvider(
  apiKey: string,
  model = process.env.LLM_MODEL ?? DEFAULT_MODEL,
  maxTokens = 4096,
): LLMProvider {
  return new GroqLLMProvider(apiKey, model, maxTokens);
}
