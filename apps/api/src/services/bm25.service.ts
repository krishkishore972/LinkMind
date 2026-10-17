import type { SearchDocument, SearchResult } from '../types/search.js';

const K1 = 1.2;
const B = 0.75;
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function tokenize(text: string): readonly string[] {
  return text.toLocaleLowerCase().match(TOKEN_PATTERN) ?? [];
}

type IndexedDocument = {
  document: SearchDocument;
  tokens: readonly string[];
  termFrequency: ReadonlyMap<string, number>;
};

function termFrequency(tokens: readonly string[]): ReadonlyMap<string, number> {
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  return frequencies;
}

function indexDocuments(documents: readonly SearchDocument[]): readonly IndexedDocument[] {
  return documents.map((document) => {
    const tokens = tokenize(document.content);
    return { document, tokens, termFrequency: termFrequency(tokens) };
  });
}

export function searchBm25(
  query: string,
  documents: readonly SearchDocument[],
  limit = 10,
): readonly SearchResult[] {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('limit must be a positive integer');
  }

  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0 || documents.length === 0) {
    return [];
  }

  const indexed = indexDocuments(documents);
  const averageDocumentLength =
    indexed.reduce((total, item) => total + item.tokens.length, 0) / indexed.length;
  const scores = indexed.map((item) => {
    let score = 0;

    for (const queryToken of queryTokens) {
      const documentFrequency = indexed.reduce(
        (count, candidate) => count + (candidate.termFrequency.has(queryToken) ? 1 : 0),
        0,
      );
      const frequency = item.termFrequency.get(queryToken) ?? 0;
      if (frequency === 0) {
        continue;
      }

      const inverseDocumentFrequency = Math.log(
        1 + (indexed.length - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      const lengthFactor =
        1 - B + B * (item.tokens.length / Math.max(averageDocumentLength, 1));
      score +=
        inverseDocumentFrequency *
        ((frequency * (K1 + 1)) / (frequency + K1 * lengthFactor));
    }

    return { document: item.document, score };
  });

  return scores
    .filter((result) => result.score > 0)
    .sort((left, right) =>
      right.score - left.score || left.document.memoryId.localeCompare(right.document.memoryId),
    )
    .slice(0, limit)
    .map((result, index) => ({ ...result.document, score: result.score, rank: index + 1 }));
}
