export const resourceTypes = [
  "Web page",
  "YouTube transcript",
  "GitHub README",
  "Paper excerpt",
  "Note",
] as const;

export type ResourceType = (typeof resourceTypes)[number];
export type ResourceId = string & { readonly __brand: "ResourceId" };

export type Resource = {
  id: ResourceId;
  title: string;
  type: ResourceType;
  source: string;
  content: string;
  excerpt: string;
  added: string;
};

export type MemoryRepresentation =
  "Raw chunk" | "Summary" | "Structured fact" | "Graph-linked fact";

export type MemoryItem = {
  id: string;
  representation: MemoryRepresentation;
  content: string;
  evidence: string;
  status: "reviewed" | "generated";
};

export type ResourceDetail = Resource & { memoryItems: MemoryItem[] };

export type MemoryRebuildResult = {
  resourcesProcessed: number;
  chunksCreated: number;
  memories: MemoryItem[];
};

export type CreateResourceInput = {
  title: string;
  type: ResourceType;
  source: string;
  content: string;
};

export type RetrievalResult = {
  rank: number;
  resourceTitle: string;
  memoryType: string;
  content: string;
  evidence: string;
  score: string;
  latency: string;
};

export type DataSourceKind = "api" | "mock";

export type RetrievalConfiguration = {
  id: "E1" | "E2" | "E3" | "E4" | "E5";
  title: string;
  description: string;
  tone: "blue" | "violet" | "teal" | "amber" | "rose";
  source: DataSourceKind;
  results: RetrievalResult[];
};

export type EvaluationRow = {
  configuration: string;
  recallAt3: string;
  mrr: string;
  latency: string;
  evidenceCorrectness: string;
};

export type EvaluationSnapshot = {
  runLabel: string;
  questionCount: number;
  configurationCount: number;
  datasetVersion: string;
  rows: EvaluationRow[];
  source: DataSourceKind;
  csvUrl?: string;
};

export type DemoSeedResult = {
  resourcesCreated: number;
  resourcesSkipped: number;
  questionsCreated: number;
  questionsSkipped: number;
  evidenceCreated: number;
  memoriesBuilt: number;
};

export type LinkMindDataSource = {
  listResources: () => Promise<Resource[]>;
  getResource: (id: ResourceId) => Promise<ResourceDetail>;
  addResource: (input: CreateResourceInput) => Promise<Resource>;
  compareQuery: (question: string) => Promise<RetrievalConfiguration[]>;
  getEvaluation: () => Promise<EvaluationSnapshot>;
  runEvaluation: () => Promise<EvaluationSnapshot>;
  seedDemo: () => Promise<DemoSeedResult>;
  rebuildMemories: (resourceIds?: ResourceId[]) => Promise<MemoryRebuildResult>;
};

const asResourceId = (value: string): ResourceId => value as ResourceId;

const resources: [Resource, Resource, Resource, Resource, ...Resource[]] = [
  {
    id: asResourceId("res-001"),
    title: "Designing personal knowledge systems",
    type: "Web page",
    source: "nesslabs.com",
    content:
      "A practical overview of turning scattered notes into a useful personal knowledge system. A knowledge system becomes useful when capture, organization, and retrieval are treated as one loop.",
    excerpt:
      "A practical overview of turning scattered notes into a useful personal knowledge system.",
    added: "Today",
  },
  {
    id: asResourceId("res-002"),
    title: "The future of memory in AI assistants",
    type: "YouTube transcript",
    source: "youtube.com",
    content:
      "A discussion of retrieval, forgetting, and why evidence matters for assistant memory. Memory systems need a way to decide what should be recalled and what should be left behind.",
    excerpt:
      "A discussion of retrieval, forgetting, and why evidence matters for assistant memory.",
    added: "Yesterday",
  },
  {
    id: asResourceId("res-003"),
    title: "pgvector: open-source vector similarity search",
    type: "GitHub README",
    source: "github.com/pgvector/pgvector",
    content:
      "Reference material for storing and querying embeddings in PostgreSQL. pgvector stores vectors in PostgreSQL and supports similarity search with SQL.",
    excerpt:
      "Reference material for storing and querying embeddings in PostgreSQL.",
    added: "2 days ago",
  },
  {
    id: asResourceId("res-004"),
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    type: "Paper excerpt",
    source: "arxiv.org",
    content:
      "An excerpt about combining parametric and non-parametric memory for generation. Retrieval gives a language model access to external evidence at query time.",
    excerpt:
      "An excerpt about combining parametric and non-parametric memory for generation.",
    added: "3 days ago",
  },
];

const configurations: RetrievalConfiguration[] = [
  {
    id: "E1",
    title: "BM25 / raw",
    description: "Lexical search over source chunks",
    tone: "blue",
    source: "mock",
    results: [
      {
        rank: 1,
        resourceTitle: resources[0].title,
        memoryType: "Raw chunk",
        content:
          "A knowledge system becomes useful when capture, organization, and retrieval are treated as one loop.",
        evidence: resources[0].excerpt,
        score: "8.42",
        latency: "12 ms",
      },
      {
        rank: 2,
        resourceTitle: resources[1].title,
        memoryType: "Raw chunk",
        content:
          "Memory systems need a way to decide what should be recalled and what should be left behind.",
        evidence: resources[1].excerpt,
        score: "6.91",
        latency: "12 ms",
      },
    ],
  },
  {
    id: "E2",
    title: "Vector / raw",
    description: "Semantic search over source chunks",
    tone: "violet",
    source: "mock",
    results: [
      {
        rank: 1,
        resourceTitle: resources[1].title,
        memoryType: "Raw chunk",
        content:
          "A memory layer should make prior context available without making the assistant pretend it knows more than it does.",
        evidence: resources[1].excerpt,
        score: "0.87",
        latency: "48 ms",
      },
      {
        rank: 2,
        resourceTitle: resources[0].title,
        memoryType: "Raw chunk",
        content:
          "The best notes are not the most complete notes. They are the notes that can be found when needed.",
        evidence: resources[0].excerpt,
        score: "0.81",
        latency: "48 ms",
      },
    ],
  },
  {
    id: "E3",
    title: "Vector / summary",
    description: "Semantic search over summaries",
    tone: "teal",
    source: "mock",
    results: [
      {
        rank: 1,
        resourceTitle: resources[0].title,
        memoryType: "Summary",
        content:
          "Personal knowledge systems connect capture, organization, and retrieval so notes remain useful over time.",
        evidence: resources[0].excerpt,
        score: "0.84",
        latency: "44 ms",
      },
      {
        rank: 2,
        resourceTitle: resources[3].title,
        memoryType: "Summary",
        content:
          "Retrieval gives a language model access to external evidence at query time.",
        evidence: resources[3].excerpt,
        score: "0.79",
        latency: "44 ms",
      },
    ],
  },
  {
    id: "E4",
    title: "Vector / facts",
    description: "Semantic search over atomic facts",
    tone: "amber",
    source: "mock",
    results: [
      {
        rank: 1,
        resourceTitle: resources[3].title,
        memoryType: "Structured fact",
        content:
          "Retrieval-augmented systems combine a language model with a non-parametric memory.",
        evidence: resources[3].excerpt,
        score: "0.82",
        latency: "46 ms",
      },
      {
        rank: 2,
        resourceTitle: resources[2].title,
        memoryType: "Structured fact",
        content:
          "pgvector stores vectors in PostgreSQL and supports similarity search with SQL.",
        evidence: resources[2].excerpt,
        score: "0.76",
        latency: "46 ms",
      },
    ],
  },
  {
    id: "E5",
    title: "Facts + graph",
    description: "Facts expanded through bounded relationships",
    tone: "rose",
    source: "mock",
    results: [
      {
        rank: 1,
        resourceTitle: resources[1].title,
        memoryType: "Graph-linked fact",
        content:
          "Evidence links make it possible to connect a recalled fact to the source and related context.",
        evidence: resources[1].excerpt,
        score: "0.89",
        latency: "61 ms",
      },
      {
        rank: 2,
        resourceTitle: resources[3].title,
        memoryType: "Graph-linked fact",
        content:
          "Retrieved passages can support a response while keeping the answer tied to external knowledge.",
        evidence: resources[3].excerpt,
        score: "0.83",
        latency: "61 ms",
      },
    ],
  },
];

const evaluation: EvaluationSnapshot = {
  runLabel: "Not run yet",
  questionCount: 30,
  configurationCount: 5,
  datasetVersion: "v0.1",
  source: "mock",
  rows: [
    {
      configuration: "BM25 / raw",
      recallAt3: "0.68",
      mrr: "0.71",
      latency: "12 ms",
      evidenceCorrectness: "92%",
    },
    {
      configuration: "Vector / raw",
      recallAt3: "0.74",
      mrr: "0.78",
      latency: "48 ms",
      evidenceCorrectness: "89%",
    },
    {
      configuration: "Vector / summary",
      recallAt3: "0.71",
      mrr: "0.75",
      latency: "44 ms",
      evidenceCorrectness: "94%",
    },
    {
      configuration: "Vector / facts",
      recallAt3: "0.77",
      mrr: "0.81",
      latency: "46 ms",
      evidenceCorrectness: "91%",
    },
    {
      configuration: "Facts + graph",
      recallAt3: "0.81",
      mrr: "0.86",
      latency: "61 ms",
      evidenceCorrectness: "90%",
    },
  ],
};

const copyResource = (resource: Resource): Resource => ({ ...resource });

const memoryItemsForResource = (resource: Resource): MemoryItem[] => [
  {
    id: `${resource.id}-raw`,
    representation: "Raw chunk",
    content: resource.content,
    evidence: resource.excerpt,
    status: "reviewed",
  },
  {
    id: `${resource.id}-summary`,
    representation: "Summary",
    content: `This source covers ${resource.title.toLowerCase()} and its relationship to source-grounded memory.`,
    evidence: resource.excerpt,
    status: "reviewed",
  },
  {
    id: `${resource.id}-fact`,
    representation: "Structured fact",
    content: resource.content.split(".")[0] ?? resource.excerpt,
    evidence: resource.excerpt,
    status: "generated",
  },
];

export const createMockDataSource = (): LinkMindDataSource => ({
  listResources: async () => resources.map(copyResource),
  getResource: async (id) => {
    const resource = resources.find((item) => item.id === id);
    if (!resource) throw new Error("Resource not found");
    return {
      ...copyResource(resource),
      memoryItems: memoryItemsForResource(resource),
    };
  },
  addResource: async (input) => {
    const resource: Resource = {
      id: asResourceId(`res-${Date.now()}`),
      title: input.title,
      type: input.type,
      source: input.source || "Local note",
      content: input.content,
      excerpt: input.content.slice(0, 130),
      added: "Just now",
    };
    resources.unshift(resource);
    return copyResource(resource);
  },
  compareQuery: async () =>
    configurations.map((configuration) => ({
      ...configuration,
      results: configuration.results.map((result) => ({ ...result })),
    })),
  getEvaluation: async () => ({
    ...evaluation,
    rows: evaluation.rows.map((row) => ({ ...row })),
  }),
  runEvaluation: async () => ({
    ...evaluation,
    rows: evaluation.rows.map((row) => ({ ...row })),
  }),
  seedDemo: async () => ({
    resourcesCreated: 0,
    resourcesSkipped: resources.length,
    questionsCreated: 0,
    questionsSkipped: 30,
    evidenceCreated: 0,
    memoriesBuilt: resources.length * 3,
  }),
  rebuildMemories: async (resourceIds) => {
    const selected = resourceIds?.length
      ? resources.filter((resource) => resourceIds.includes(resource.id))
      : resources;
    const memories = selected.flatMap(memoryItemsForResource);
    return {
      resourcesProcessed: selected.length,
      chunksCreated: memories.length,
      memories,
    };
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const stringValue = (value: unknown, field: string): string => {
  if (typeof value !== "string")
    throw new Error(`Invalid API response field: ${field}`);
  return value;
};
const numberValue = (value: unknown, field: string): number => {
  if (typeof value !== "number")
    throw new Error(`Invalid API response field: ${field}`);
  return value;
};

const nullableStringValue = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined) return null;
  return stringValue(value, field);
};

type ApiResourceType =
  | "note"
  | "webpage"
  | "youtube_transcript"
  | "github_readme"
  | "paper_excerpt"
  | "other";

const apiResourceTypes: readonly ApiResourceType[] = [
  "note",
  "webpage",
  "youtube_transcript",
  "github_readme",
  "paper_excerpt",
  "other",
];

const resourceTypeToApi: Record<ResourceType, ApiResourceType> = {
  Note: "note",
  "Web page": "webpage",
  "YouTube transcript": "youtube_transcript",
  "GitHub README": "github_readme",
  "Paper excerpt": "paper_excerpt",
};

const apiTypeToResource: Record<ApiResourceType, ResourceType> = {
  note: "Note",
  webpage: "Web page",
  youtube_transcript: "YouTube transcript",
  github_readme: "GitHub README",
  paper_excerpt: "Paper excerpt",
  other: "Note",
};

const isApiResourceType = (value: string): value is ApiResourceType =>
  apiResourceTypes.some((type) => type === value);

const formatAddedDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const elapsedDays = Math.floor(
    (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (elapsedDays <= 0) return "Today";
  if (elapsedDays === 1) return "Yesterday";
  if (elapsedDays < 7) return `${elapsedDays} days ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
};

const sourceLabel = (sourceUrl: string | null): string => {
  if (!sourceUrl) return "";
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return sourceUrl;
  }
};

const parseResource = (value: unknown): Resource => {
  if (!isRecord(value)) throw new Error("Invalid resource response");
  const apiType = stringValue(value.type, "resource.type");
  if (!isApiResourceType(apiType)) throw new Error("Invalid resource type");
  const content = stringValue(value.content, "resource.content");
  const sourceUrl = nullableStringValue(value.sourceUrl, "resource.sourceUrl");
  return {
    id: asResourceId(stringValue(value.id, "resource.id")),
    title: stringValue(value.title, "resource.title"),
    type: apiTypeToResource[apiType],
    source: sourceLabel(sourceUrl),
    content,
    excerpt: content.slice(0, 130),
    added: formatAddedDate(
      nullableStringValue(value.createdAt, "resource.createdAt") ?? "",
    ),
  };
};

const parseResources = (value: unknown): Resource[] => {
  if (!isRecord(value) || !Array.isArray(value.resources))
    throw new Error("Invalid resources response");
  return value.resources.map(parseResource);
};

type ApiMemoryRepresentation = "raw" | "summary" | "fact";
type ApiProvenance = "verified" | "generated" | "unverified";
const BM25_QUERY_LIMIT = 10;

const memoryRepresentationLabels: Record<
  ApiMemoryRepresentation,
  MemoryRepresentation
> = {
  raw: "Raw chunk",
  summary: "Summary",
  fact: "Structured fact",
};

const parseMemoryRepresentation = (value: string): ApiMemoryRepresentation => {
  switch (value) {
    case "raw":
    case "summary":
    case "fact":
      return value;
    default:
      throw new Error("Invalid memory representation");
  }
};

const parseProvenance = (value: string): ApiProvenance => {
  switch (value) {
    case "verified":
    case "generated":
    case "unverified":
      return value;
    default:
      throw new Error("Invalid memory provenance");
  }
};

const parseMemoryItems = (value: unknown): MemoryItem[] => {
  if (!Array.isArray(value)) throw new Error("Invalid memory response");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("Invalid memory item response");
    const representation = parseMemoryRepresentation(
      stringValue(item.representation, "memory.representation"),
    );
    const provenance = parseProvenance(
      stringValue(item.provenance, "memory.provenance"),
    );
    return {
      id: stringValue(item.id, "memory.id"),
      representation: memoryRepresentationLabels[representation],
      content: stringValue(item.content, "memory.content"),
      evidence:
        nullableStringValue(item.evidenceText, "memory.evidenceText") ??
        stringValue(item.content, "memory.content"),
      status: provenance === "verified" ? "reviewed" : "generated",
    };
  });
};

const parseResourceDetail = (value: unknown): ResourceDetail => {
  if (!isRecord(value) || !isRecord(value.resource))
    throw new Error("Invalid resource detail response");
  const memoryItems = Array.isArray(value.memoryItems)
    ? parseMemoryItems(value.memoryItems)
    : [];
  return { ...parseResource(value.resource), memoryItems };
};

const textValue = (value: unknown, field: string): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  throw new Error(`Invalid API response field: ${field}`);
};

const configurationMetadata: Record<
  RetrievalConfiguration["id"],
  Omit<RetrievalConfiguration, "id" | "source" | "results">
> = {
  E1: {
    title: "BM25 / raw",
    description: "Lexical search over source chunks",
    tone: "blue",
  },
  E2: {
    title: "Vector / raw",
    description: "Semantic search over source chunks",
    tone: "violet",
  },
  E3: {
    title: "Vector / summary",
    description: "Semantic search over summaries",
    tone: "teal",
  },
  E4: {
    title: "Vector / facts",
    description: "Semantic search over atomic facts",
    tone: "amber",
  },
  E5: {
    title: "Facts + graph",
    description: "Facts expanded through bounded relationships",
    tone: "rose",
  },
};

const memoryTypeForConfiguration = (
  configuration: RetrievalConfiguration["id"],
): string => {
  if (configuration === "E3") return "Summary";
  if (configuration === "E4") return "Structured fact";
  if (configuration === "E5") return "Graph-linked fact";
  return "Raw chunk";
};

const configurationLabel = (configuration: string): string => {
  if (
    configuration === "E1" ||
    configuration === "E2" ||
    configuration === "E3" ||
    configuration === "E4" ||
    configuration === "E5"
  ) {
    return configurationMetadata[configuration].title;
  }
  return configuration;
};

const parseCompareResults = (value: unknown): RetrievalConfiguration[] => {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("Invalid compare response");
  }

  const apiConfigurations = new Map<
    RetrievalConfiguration["id"],
    Record<string, unknown>
  >();
  for (const item of value.results) {
    if (!isRecord(item)) throw new Error("Invalid compare configuration");
    const id = parseConfigurationId(
      stringValue(item.configuration, "compare.configuration"),
    );
    apiConfigurations.set(id, item);
  }

  return (["E1", "E2", "E3", "E4", "E5"] as const).map((id) => {
    const item = apiConfigurations.get(id);
    const latencyMs = item?.latencyMs;
    const latency =
      latencyMs === undefined || latencyMs === null
        ? "Not measured"
        : `${numberValue(latencyMs, "compare.latencyMs")} ms`;
    const rawResults = item?.results;
    if (rawResults !== undefined && !Array.isArray(rawResults)) {
      throw new Error("Invalid compare results");
    }
    const results = (rawResults ?? []).map((result) => {
      if (!isRecord(result)) throw new Error("Invalid compare result");
      return {
        rank: numberValue(result.rank, "result.rank"),
        resourceTitle: stringValue(result.resourceTitle, "result.resourceTitle"),
        memoryType: memoryTypeForConfiguration(id),
        content: stringValue(result.content, "result.content"),
        evidence:
          nullableStringValue(result.evidenceText, "result.evidenceText") ??
          stringValue(result.content, "result.content"),
        score: textValue(result.score, "result.score"),
        latency,
      } satisfies RetrievalResult;
    });
    return {
      id,
      ...configurationMetadata[id],
      source: "api",
      results,
    };
  });
};

const parseConfigurationId = (value: string): RetrievalConfiguration["id"] => {
  switch (value) {
    case "E1":
    case "E2":
    case "E3":
    case "E4":
    case "E5":
      return value;
    default:
      throw new Error("Invalid retrieval configuration id");
  }
};

const nullableNumberValue = (value: unknown, field: string): number | null => {
  if (value === null || value === undefined) return null;
  return numberValue(value, field);
};

const formatMetric = (value: number | null, digits = 2): string =>
  value === null ? "—" : value.toFixed(digits);

const parseEvaluationRun = (
  value: unknown,
  csvUrl?: string,
): EvaluationSnapshot => {
  if (!isRecord(value) || !isRecord(value.run)) {
    throw new Error("Invalid evaluation run response");
  }
  const run = value.run;
  const results = Array.isArray(run.results) ? run.results : [];
  const grouped = new Map<string, Record<string, unknown>[]>();
  const questions = new Set<string>();
  for (const item of results) {
    if (!isRecord(item)) throw new Error("Invalid evaluation result");
    const configuration = stringValue(
      item.configuration,
      "evaluation.configuration",
    );
    const current = grouped.get(configuration) ?? [];
    current.push(item);
    grouped.set(configuration, current);
    questions.add(stringValue(item.questionId, "evaluation.questionId"));
  }

  const rows = [...grouped.entries()].map(([configuration, items]) => {
    const recall = items
      .map((item) => nullableNumberValue(item.recallAt3, "evaluation.recallAt3"))
      .filter((value): value is number => value !== null);
    const mrr = items
      .map((item) => nullableNumberValue(item.mrr, "evaluation.mrr"))
      .filter((value): value is number => value !== null);
    const latency = items.map((item) =>
      numberValue(item.latencyMs, "evaluation.latencyMs"),
    );
    const audited = items
      .map((item) => item.evidenceCorrect)
      .filter((value): value is boolean => typeof value === "boolean");
    const evidenceCorrectness = audited.length
      ? `${Math.round(
          (audited.filter((value) => value).length / audited.length) * 100,
        )}%`
      : "Not audited";
    return {
      configuration,
      recallAt3: formatMetric(
        recall.length
          ? recall.reduce((sum, value) => sum + value, 0) / recall.length
          : null,
      ),
      mrr: formatMetric(
        mrr.length
          ? mrr.reduce((sum, value) => sum + value, 0) / mrr.length
          : null,
      ),
      latency: latency.length
        ? `${Math.round(latency.reduce((sum, value) => sum + value, 0) / latency.length)} ms`
        : "—",
      evidenceCorrectness,
    };
  });

  return {
    runLabel: stringValue(run.completedAt ?? run.startedAt, "evaluation.runDate"),
    questionCount: questions.size,
    configurationCount: grouped.size,
    datasetVersion: stringValue(run.datasetVersion, "evaluation.datasetVersion"),
    rows: rows.map((row) => ({
      ...row,
      configuration: configurationLabel(row.configuration),
    })),
    source: "api",
    csvUrl,
  };
};

const parseDemoSeedResult = (value: unknown): DemoSeedResult => {
  if (!isRecord(value) || !isRecord(value.result))
    throw new Error("Invalid demo seed response");
  return {
    resourcesCreated: numberValue(
      value.result.resourcesCreated,
      "seed.resourcesCreated",
    ),
    resourcesSkipped: numberValue(
      value.result.resourcesSkipped,
      "seed.resourcesSkipped",
    ),
    questionsCreated: numberValue(
      value.result.questionsCreated,
      "seed.questionsCreated",
    ),
    questionsSkipped: numberValue(
      value.result.questionsSkipped,
      "seed.questionsSkipped",
    ),
    evidenceCreated: numberValue(
      value.result.evidenceCreated,
      "seed.evidenceCreated",
    ),
    memoriesBuilt: numberValue(
      value.result.memoriesBuilt,
      "seed.memoriesBuilt",
    ),
  };
};

class LinkMindApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LinkMindApiError";
  }
}

const request = async (
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : `LinkMind API returned ${response.status}`;
    throw new LinkMindApiError(response.status, message);
  }
  return body;
};

const isNotFound = (cause: unknown): boolean =>
  cause instanceof LinkMindApiError && cause.status === 404;

export const createHttpDataSource = (
  baseUrl: string,
  fallback: LinkMindDataSource = createMockDataSource(),
): LinkMindDataSource => ({
  listResources: async () =>
    parseResources(await request(baseUrl, "/api/resources")),
  getResource: async (id) => {
    return parseResourceDetail(await request(baseUrl, `/api/resources/${id}`));
  },
  addResource: async (input) => {
    const value = await request(baseUrl, "/api/resources", {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        type: resourceTypeToApi[input.type],
        sourceUrl: input.source.trim() || undefined,
        content: input.content,
      }),
    });
    if (!isRecord(value) || !("resource" in value))
      throw new Error("Invalid resource create response");
    if (!isRecord(value.resource))
      throw new Error("Invalid resource create response");
    return parseResource(value.resource);
  },
  compareQuery: async (question) => {
    try {
      const value = await request(baseUrl, "/api/compare", {
        method: "POST",
        body: JSON.stringify({
          query: question,
          limit: BM25_QUERY_LIMIT,
          configurations: ["E1", "E2", "E3", "E4", "E5"],
        }),
      });
      return parseCompareResults(value);
    } catch (cause) {
      if (isNotFound(cause)) return fallback.compareQuery(question);
      throw cause;
    }
  },
  getEvaluation: async () => {
    try {
      const value = await request(baseUrl, "/api/evaluation/runs");
      if (!isRecord(value) || !Array.isArray(value.runs)) {
        throw new Error("Invalid evaluation runs response");
      }
      const latest = value.runs[0];
      if (!latest) {
        return {
          runLabel: "No runs yet",
          questionCount: 0,
          configurationCount: 0,
          datasetVersion: "—",
          rows: [],
          source: "api",
        };
      }
      if (!isRecord(latest)) throw new Error("Invalid evaluation run summary");
      const runId = stringValue(latest.id, "evaluation.runId");
      return parseEvaluationRun(
        await request(baseUrl, `/api/evaluation/runs/${runId}`),
        `${baseUrl.replace(/\/$/, "")}/api/evaluation/runs/${runId}.csv`,
      );
    } catch (cause) {
      if (isNotFound(cause)) return fallback.getEvaluation();
      throw cause;
    }
  },
  runEvaluation: async () => {
    try {
      const value = await request(baseUrl, "/api/evaluation/run", {
        method: "POST",
        body: JSON.stringify({
          configurations: ["E1", "E2", "E3", "E4", "E5"],
        }),
      });
      if (!isRecord(value) || !isRecord(value.result)) {
        throw new Error("Invalid evaluation run response");
      }
      const runId = stringValue(value.result.runId, "evaluation.runId");
      return parseEvaluationRun(
        await request(baseUrl, `/api/evaluation/runs/${runId}`),
        `${baseUrl.replace(/\/$/, "")}/api/evaluation/runs/${runId}.csv`,
      );
    } catch (cause) {
      if (isNotFound(cause)) return fallback.runEvaluation();
      throw cause;
    }
  },
  seedDemo: async () => {
    try {
      const value = await request(baseUrl, "/api/demo/seed", {
        method: "POST",
      });
      return parseDemoSeedResult(value);
    } catch (cause) {
      if (isNotFound(cause)) return fallback.seedDemo();
      throw cause;
    }
  },
  rebuildMemories: async (resourceIds) => {
    const value = await request(baseUrl, "/api/memories/rebuild", {
      method: "POST",
      body: JSON.stringify({ resourceIds }),
    });
    if (!isRecord(value)) throw new Error("Invalid rebuild response");
    return {
      resourcesProcessed: numberValue(
        value.resourcesProcessed,
        "rebuild.resourcesProcessed",
      ),
      chunksCreated: numberValue(value.chunksCreated, "rebuild.chunksCreated"),
      memories: parseMemoryItems(value.memories),
    };
  },
});

export const dataSource: LinkMindDataSource = process.env
  .NEXT_PUBLIC_LINKMIND_API_URL
  ? createHttpDataSource(process.env.NEXT_PUBLIC_LINKMIND_API_URL)
  : createMockDataSource();

export const detectResourceType = (value: string): ResourceType | null => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be"))
      return "YouTube transcript";
    if (host.includes("github.com")) return "GitHub README";
    if (host.includes("arxiv.org") || host.includes("doi.org"))
      return "Paper excerpt";
    return "Web page";
  } catch {
    return null;
  }
};
