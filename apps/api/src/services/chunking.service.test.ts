import { describe, expect, it } from 'vitest';
import { chunkResource } from './chunking.service.js';
import { normalizeText } from './normalization.service.js';

describe('normalizeText', () => {
  it('collapses whitespace and trims the normalized result', () => {
    const normalized = normalizeText('  Alpha\n\n  beta\t gamma  ');

    expect(normalized.text).toBe('Alpha beta gamma');
    expect(normalized.sourceOffsets).toHaveLength(normalized.text.length);
  });

  it('returns an empty result for whitespace-only input', () => {
    expect(normalizeText(' \n\t ').text).toBe('');
  });
});

describe('chunkResource', () => {
  it('creates bounded overlapping chunks with source provenance', () => {
    const source = '0123456789ABCDEFGHIJ';
    const chunks = chunkResource('resource-1', source, {
      maxCharacters: 10,
      overlapCharacters: 3,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.content)).toEqual([
      '0123456789',
      '789ABCDEFG',
      'EFGHIJ',
    ]);
    expect(chunks[0]).toMatchObject({
      resourceId: 'resource-1',
      chunkIndex: 0,
      evidenceText: '0123456789',
      evidenceStart: 0,
      evidenceEnd: 10,
    });
  });

  it('maps normalized chunk boundaries to original evidence', () => {
    const source = 'alpha   beta\n\ngamma';
    const chunks = chunkResource('resource-2', source, {
      maxCharacters: 10,
      overlapCharacters: 2,
    });

    expect(chunks[0]?.content).toBe('alpha beta');
    expect(chunks[0]?.evidenceText).toBe('alpha   beta');
    expect(source.slice(chunks[0]?.evidenceStart ?? 0, chunks[0]?.evidenceEnd)).toBe(
      chunks[0]?.evidenceText,
    );
  });

  it('returns no chunks for empty input', () => {
    expect(chunkResource('resource-3', '   ')).toEqual([]);
  });

  it('rejects invalid overlap settings', () => {
    expect(() =>
      chunkResource('resource-4', 'content', {
        maxCharacters: 10,
        overlapCharacters: 10,
      }),
    ).toThrow('overlapCharacters must be smaller than maxCharacters');
  });
});
