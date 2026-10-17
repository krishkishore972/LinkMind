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

export type RetrievalConfiguration = {
  id: "E1" | "E2" | "E3" | "E4" | "E5";
  title: string;
  description: string;
  tone: "blue" | "violet" | "teal" | "amber" | "rose";
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
};

export type LinkMindDataSource = {
  listResources: () => Promise<Resource[]>;
  getResource: (id: ResourceId) => Promise<ResourceDetail>;
  addResource: (input: CreateResourceInput) => Promise<Resource>;
  compareQuery: (question: string) => Promise<RetrievalConfiguration[]>;
  getEvaluation: () => Promise<EvaluationSnapshot>;
  seedDemo: () => Promise<{ resourcesAdded: number; questionsAdded: number }>;
  rebuildMemories: (
    resourceIds?: ResourceId[],
  ) => Promise<{ memoriesBuilt: number }>;
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

export const createMockDataSource = (): LinkMindDataSource => ({
  listResources: async () => resources.map(copyResource),
  getResource: async (id) => {
    const resource = resources.find((item) => item.id === id);
    if (!resource) throw new Error("Resource not found");
    return {
      ...copyResource(resource),
      memoryItems: [
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
      ],
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
  seedDemo: async () => ({ resourcesAdded: 0, questionsAdded: 30 }),
  rebuildMemories: async (resourceIds) => ({
    memoriesBuilt: resourceIds?.length
      ? resourceIds.length * 3
      : resources.length * 3,
  }),
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

const parseResource = (value: unknown): Resource => {
  if (!isRecord(value)) throw new Error("Invalid resource response");
  const type = stringValue(value.type, "resource.type");
  if (!(resourceTypes as readonly string[]).includes(type))
    throw new Error("Invalid resource type");
  return {
    id: asResourceId(stringValue(value.id, "resource.id")),
    title: stringValue(value.title, "resource.title"),
    type: type as ResourceType,
    source: stringValue(value.source ?? "", "resource.source"),
    content: stringValue(
      value.content ?? value.excerpt ?? "",
      "resource.content",
    ),
    excerpt: stringValue(
      value.excerpt ?? value.content ?? "",
      "resource.excerpt",
    ),
    added: stringValue(value.added ?? "", "resource.added"),
  };
};

const parseResources = (value: unknown): Resource[] => {
  if (!Array.isArray(value)) throw new Error("Invalid resources response");
  return value.map(parseResource);
};

const request = async (
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`LinkMind API returned ${response.status}`);
  return response.json() as Promise<unknown>;
};

export const createHttpDataSource = (baseUrl: string): LinkMindDataSource => ({
  listResources: async () =>
    parseResources(await request(baseUrl, "/api/resources")),
  getResource: async (id) => {
    const value = await request(baseUrl, `/api/resources/${id}`);
    if (!isRecord(value) || !Array.isArray(value.memoryItems))
      throw new Error("Invalid resource detail response");
    return {
      ...parseResource(value),
      memoryItems: value.memoryItems as MemoryItem[],
    };
  },
  addResource: async (input) =>
    parseResource(
      await request(baseUrl, "/api/resources", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
  compareQuery: async (question) => {
    const value = await request(baseUrl, "/api/query/compare", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    if (!isRecord(value) || !Array.isArray(value.configurations))
      throw new Error("Invalid comparison response");
    return value.configurations as RetrievalConfiguration[];
  },
  getEvaluation: async () => {
    const value = await request(baseUrl, "/api/evaluation/latest");
    if (!isRecord(value)) throw new Error("Invalid evaluation response");
    return {
      runLabel: stringValue(value.runLabel, "evaluation.runLabel"),
      questionCount: numberValue(
        value.questionCount,
        "evaluation.questionCount",
      ),
      configurationCount: numberValue(
        value.configurationCount,
        "evaluation.configurationCount",
      ),
      datasetVersion: stringValue(
        value.datasetVersion,
        "evaluation.datasetVersion",
      ),
      rows: Array.isArray(value.rows) ? (value.rows as EvaluationRow[]) : [],
    };
  },
  seedDemo: async () => {
    const value = await request(baseUrl, "/api/demo/seed", { method: "POST" });
    if (!isRecord(value)) throw new Error("Invalid seed response");
    return {
      resourcesAdded: numberValue(value.resourcesAdded, "seed.resourcesAdded"),
      questionsAdded: numberValue(value.questionsAdded, "seed.questionsAdded"),
    };
  },
  rebuildMemories: async (resourceIds) => {
    const value = await request(baseUrl, "/api/memories/rebuild", {
      method: "POST",
      body: JSON.stringify({ resourceIds }),
    });
    if (!isRecord(value)) throw new Error("Invalid rebuild response");
    return {
      memoriesBuilt: numberValue(value.memoriesBuilt, "rebuild.memoriesBuilt"),
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
