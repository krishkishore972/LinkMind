import { describe, expect, it } from "vitest";
import { createMockDataSource, detectResourceType } from "./linkmind";

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
