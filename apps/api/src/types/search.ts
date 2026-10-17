export type SearchDocument = {
  memoryId: string;
  resourceId: string;
  resourceTitle: string;
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
