export type SearchDocument = {
  memoryId: string;
  resourceId: string;
  resourceTitle: string;
  sourceUrl?: string | null;
  content: string;
  evidenceText: string | null;
};

export type SearchResult = SearchDocument & {
  score: number;
  rank: number;
};

export type SearchInput = {
  query: string;
  limit?: number;
};

/**
 * Retrieval configurations, matching the `RetrievalConfiguration` enum values
 * in the database contract.
 */
export type RetrievalConfiguration = 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
