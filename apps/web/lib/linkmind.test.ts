import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHttpDataSource,
  createMockDataSource,
  detectResourceType,
} from "./linkmind";

describe("resource type detection", () => {
  it("detects supported URL sources", () => {
    expect(detectResourceType("https://github.com/example/project")).toBe(
      "GitHub README",
    );
    expect(detectResourceType("https://www.youtube.com/watch?v=demo")).toBe(
      "YouTube transcript",
    );
    expect(detectResourceType("https://arxiv.org/abs/1234.5678")).toBe(
      "Paper excerpt",
    );
    expect(detectResourceType("plain text")).toBeNull();
  });
});

describe("mock data source", () => {
  it("supports the same resource operations as the API contract", async () => {
    const source = createMockDataSource();
    const before = await source.listResources();
    const created = await source.addResource({
      title: "Mock note",
      type: "Note",
      source: "",
      content: "A note used by the adapter test.",
    });
    const after = await source.listResources();
    const detail = await source.getResource(created.id);

    expect(after).toHaveLength(before.length + 1);
    expect(detail.content).toContain("A note used by the adapter test.");
    expect(detail.memoryItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          representation: "Raw chunk",
          status: "reviewed",
        }),
        expect.objectContaining({
          representation: "Structured fact",
          status: "generated",
        }),
      ]),
    );
  });
});

describe("HTTP data source", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps implemented resource and memory route responses", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = (body: unknown, status = 200): Response =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    fetchMock
      .mockResolvedValueOnce(
        response({
          resources: [
            {
              id: "resource-1",
              title: "API note",
              type: "note",
              sourceUrl: null,
              content: "Evidence from the API.",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          resource: {
            id: "resource-1",
            title: "API note",
            type: "webpage",
            sourceUrl: "https://example.com/research",
            content: "Evidence from the API.",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        response({
          resource: {
            id: "resource-2",
            title: "Created API note",
            type: "github_readme",
            sourceUrl: "https://github.com/example/project",
            content: "Created content.",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        response({
          resourcesProcessed: 1,
          chunksCreated: 1,
          memories: [
            {
              id: "memory-1",
              resourceId: "resource-1",
              representation: "raw",
              chunkIndex: 0,
              content: "Evidence from the API.",
              evidenceText: "Evidence from the API.",
              evidenceStart: 0,
              evidenceEnd: 23,
              provenance: "verified",
              metadata: {},
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      );

    const source = createHttpDataSource("http://localhost:4000");
    const resources = await source.listResources();
    const resource = resources[0];
    if (!resource) throw new Error("Expected a resource in the test fixture");
    const detail = await source.getResource(resource.id);
    const created = await source.addResource({
      title: "Created API note",
      type: "GitHub README",
      source: "https://github.com/example/project",
      content: "Created content.",
    });
    const rebuilt = await source.rebuildMemories([resource.id]);

    expect(resources[0]).toMatchObject({
      id: "resource-1",
      type: "Note",
      source: "",
      content: "Evidence from the API.",
    });
    expect(detail).toMatchObject({
      type: "Web page",
      source: "example.com",
      memoryItems: [],
    });
    expect(created).toMatchObject({
      type: "GitHub README",
      source: "github.com",
    });
    expect(rebuilt).toMatchObject({
      resourcesProcessed: 1,
      chunksCreated: 1,
      memories: [
        expect.objectContaining({
          representation: "Raw chunk",
          status: "reviewed",
        }),
      ],
    });

    const createRequest = fetchMock.mock.calls[2]?.[1];
    expect(createRequest?.body).toBe(
      JSON.stringify({
        title: "Created API note",
        type: "github_readme",
        sourceUrl: "https://github.com/example/project",
        content: "Created content.",
      }),
    );
  });

  it("falls back to mock retrieval and evaluation data when routes are unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }))
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }));

    const source = createHttpDataSource("http://localhost:4000");
    await expect(source.compareQuery("What is memory?")).resolves.toHaveLength(
      5,
    );
    await expect(source.getEvaluation()).resolves.toMatchObject({
      configurationCount: 5,
    });
  });

  it("maps the implemented comparison and demo seed responses", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = (body: unknown): Response =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    fetchMock
      .mockResolvedValueOnce(
        response({
          results: [
            {
              configuration: "E1",
              latencyMs: 3,
              results: [
                {
                  memoryId: "memory-1",
                  resourceId: "resource-1",
                  resourceTitle: "API note",
                  content: "BM25 evidence",
                  evidenceText: "BM25 evidence",
                  score: 1.5,
                  rank: 1,
                },
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          result: {
            resourcesCreated: 20,
            resourcesSkipped: 0,
            questionsCreated: 30,
            questionsSkipped: 0,
            evidenceCreated: 30,
            memoriesBuilt: 20,
          },
        }),
      );

    const source = createHttpDataSource("http://localhost:4000");
    const configurations = await source.compareQuery("What is BM25?");
    const seed = await source.seedDemo();

    expect(configurations[0]).toMatchObject({
      id: "E1",
      source: "api",
      results: [
        expect.objectContaining({
          memoryType: "Raw chunk",
          evidence: "BM25 evidence",
          score: "1.5",
          latency: "3 ms",
        }),
      ],
    });
    expect(configurations).toHaveLength(5);
    expect(configurations.every((item) => item.source === "api")).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/compare",
    );
    expect(seed).toEqual({
      resourcesCreated: 20,
      resourcesSkipped: 0,
      questionsCreated: 30,
      questionsSkipped: 0,
      evidenceCreated: 30,
      memoriesBuilt: 20,
    });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({
        query: "What is BM25?",
        limit: 10,
        configurations: ["E1", "E2", "E3", "E4", "E5"],
      }),
    );
  });

  it("maps persisted evaluation runs and starts a new run", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = (body: unknown): Response =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    fetchMock
      .mockResolvedValueOnce(
        response({
          runs: [
            {
              id: "run-1",
              startedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          run: {
            id: "run-1",
            startedAt: "2026-01-01T00:00:00.000Z",
            completedAt: "2026-01-01T00:01:00.000Z",
            datasetVersion: "v1.0",
            results: [
              {
                questionId: "question-1",
                configuration: "E1",
                recallAt3: 1,
                mrr: 1,
                evidenceCorrect: null,
                latencyMs: 4,
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        response({
          result: {
            runId: "run-2",
            datasetVersion: "v1.0",
            totalQuestions: 1,
            configurations: ["E1"],
            aggregateMetrics: {
              E1: {
                recallAt3: 1,
                mrr: 1,
                avgLatencyMs: 5,
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        response({
          run: {
            id: "run-2",
            startedAt: "2026-01-01T00:02:00.000Z",
            completedAt: "2026-01-01T00:03:00.000Z",
            datasetVersion: "v1.0",
            results: [
              {
                questionId: "question-1",
                configuration: "E1",
                recallAt3: 1,
                mrr: 1,
                evidenceCorrect: null,
                latencyMs: 5,
              },
            ],
          },
        }),
      );

    const source = createHttpDataSource("http://localhost:4000");
    await expect(source.getEvaluation()).resolves.toMatchObject({
      runLabel: "2026-01-01T00:01:00.000Z",
      questionCount: 1,
      configurationCount: 1,
      rows: [
        expect.objectContaining({
          configuration: "BM25 / raw",
          recallAt3: "1.00",
          mrr: "1.00",
          latency: "4 ms",
          evidenceCorrectness: "Not audited",
        }),
      ],
    });
    await expect(source.runEvaluation()).resolves.toMatchObject({
      runLabel: "2026-01-01T00:03:00.000Z",
      questionCount: 1,
      source: "api",
      rows: [expect.objectContaining({ configuration: "BM25 / raw" })],
    });
  });
});
