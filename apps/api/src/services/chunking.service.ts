import { normalizeText, type NormalizedText } from './normalization.service.js';

export type ChunkingOptions = {
  maxCharacters?: number;
  overlapCharacters?: number;
};

export type ResourceChunk = {
  resourceId: string;
  chunkIndex: number;
  content: string;
  evidenceText: string;
  evidenceStart: number;
  evidenceEnd: number;
};

const DEFAULT_MAX_CHARACTERS = 1000;
const DEFAULT_OVERLAP_CHARACTERS = 150;

function validateOptions(maxCharacters: number, overlapCharacters: number): void {
  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new Error('maxCharacters must be a positive integer');
  }

  if (!Number.isInteger(overlapCharacters) || overlapCharacters < 0) {
    throw new Error('overlapCharacters must be a non-negative integer');
  }

  if (overlapCharacters >= maxCharacters) {
    throw new Error('overlapCharacters must be smaller than maxCharacters');
  }
}

function sourceRange(
  normalized: NormalizedText,
  start: number,
  end: number,
  originalLength: number,
): { start: number; end: number } {
  const firstSourceOffset = normalized.sourceOffsets[start];
  const lastSourceOffset = normalized.sourceOffsets[end - 1];

  if (firstSourceOffset === undefined || lastSourceOffset === undefined) {
    return { start: 0, end: 0 };
  }

  return {
    start: firstSourceOffset,
    end: Math.min(lastSourceOffset + 1, originalLength),
  };
}

export function chunkResource(
  resourceId: string,
  source: string,
  options: ChunkingOptions = {},
): readonly ResourceChunk[] {
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
  const overlapCharacters =
    options.overlapCharacters ?? DEFAULT_OVERLAP_CHARACTERS;
  validateOptions(maxCharacters, overlapCharacters);

  const normalized = normalizeText(source);
  if (normalized.text.length === 0) {
    return [];
  }

  const chunks: ResourceChunk[] = [];
  let start = 0;

  while (start < normalized.text.length) {
    const end = Math.min(start + maxCharacters, normalized.text.length);
    const range = sourceRange(normalized, start, end, source.length);

    chunks.push({
      resourceId,
      chunkIndex: chunks.length,
      content: normalized.text.slice(start, end),
      evidenceText: source.slice(range.start, range.end),
      evidenceStart: range.start,
      evidenceEnd: range.end,
    });

    if (end === normalized.text.length) {
      break;
    }

    start = end - overlapCharacters;
  }

  return chunks;
}
