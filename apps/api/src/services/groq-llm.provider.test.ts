import { describe, expect, it, vi } from 'vitest';
import { GroqLLMProvider } from './groq-llm.provider.js';

describe('GroqLLMProvider', () => {
  it('generates text through the Groq chat-completions contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'READY' } }],
      }),
    }));

    const provider = new GroqLLMProvider('test-key', 'test-model');
    await expect(provider.generate('Say READY')).resolves.toBe('READY');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
  });

  it('maps source-number citations to the supplied source metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              answer: 'Grounded answer',
              citations: [{ sourceNumber: 1 }],
              abstained: false,
            }),
          },
        }],
      }),
    }));

    const provider = new GroqLLMProvider('test-key', 'test-model');
    const result = await provider.generateWithCitations('Question', [{
      memoryId: 'memory-1',
      resourceId: 'resource-1',
      resourceTitle: 'Source',
      content: 'Content',
      evidenceText: 'Evidence',
      score: 1,
      rank: 1,
    }]);

    expect(result).toMatchObject({
      answer: 'Grounded answer',
      abstained: false,
      citations: [{ memoryId: 'memory-1', resourceId: 'resource-1', evidenceText: 'Evidence' }],
    });
  });
});
