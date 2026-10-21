"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CONFIGURATIONS = ["E1", "E2", "E3", "E4", "E5"] as const;
type Configuration = (typeof CONFIGURATIONS)[number];
type ResourceType =
  | "note"
  | "webpage"
  | "youtube_transcript"
  | "github_readme"
  | "paper_excerpt"
  | "other";
type Resource = {
  id: string;
  title: string;
  type: ResourceType;
  sourceUrl: string | null;
  content: string;
};
type SearchResult = {
  memoryId: string;
  resourceId: string;
  resourceTitle: string;
  sourceUrl?: string | null;
  content: string;
  evidenceText: string | null;
  score: number;
  rank: number;
};
type Comparison = {
  configuration: Configuration;
  results: SearchResult[];
  latencyMs: number;
};
type Answer = {
  query: string;
  answer: string;
  citations: Array<{
    memoryId: string;
    resourceId: string;
    resourceTitle: string;
    sourceUrl?: string | null;
    evidenceText: string;
  }>;
  abstained: boolean;
  latencyMs: number;
};
type EvaluationRun = {
  runId: string;
  totalQuestions: number;
  configurations: Configuration[];
  aggregateMetrics: Partial<
    Record<
      Configuration,
      {
        recallAt3: number;
        mrr: number;
        avgLatencyMs: number;
        questionsAnswered: number;
        questionsAbstained: number;
      }
    >
  >;
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

function formatType(type: ResourceType): string {
  return type.replaceAll("_", " ");
}
function configurationName(configuration: Configuration): string {
  return {
    E1: "BM25 · raw",
    E2: "Vector · raw",
    E3: "Vector · summary",
    E4: "Vector · facts",
    E5: "Graph · facts",
  }[configuration];
}

function ConfigurationToggle({
  configuration,
  selected,
  onToggle,
}: {
  configuration: Configuration;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? styles.configSelected : styles.configButton}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {configuration}
    </button>
  );
}

function ComparisonPanel({ comparison }: { comparison: Comparison }) {
  return (
    <article className={styles.resultPanel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.configTag}>{comparison.configuration}</span>
          <h4>{configurationName(comparison.configuration)}</h4>
        </div>
        <span className={styles.latency}>{comparison.latencyMs} ms</span>
      </div>
      {comparison.results.length === 0 ? (
        <div className={styles.emptyResult}>
          <span className={styles.emptyIcon}>○</span>
          <strong>No indexed evidence</strong>
          <span>Build this memory representation to populate it.</span>
        </div>
      ) : (
        <div className={styles.resultList}>
          {comparison.results.map((result) => (
            <div className={styles.resultItem} key={result.memoryId}>
              <div className={styles.rank}>
                {String(result.rank).padStart(2, "0")}
              </div>
              <div className={styles.resultBody}>
                <strong title={result.resourceTitle}>
                  {result.sourceUrl ? (
                    <a
                      className={styles.sourceLink}
                      href={result.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {result.resourceTitle}
                    </a>
                  ) : (
                    result.resourceTitle
                  )}
                </strong>
                <p>{result.evidenceText || result.content}</p>
                <span>score {result.score.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [query, setQuery] = useState(
    "How does LinkMind use pgvector for semantic retrieval?",
  );
  const [limit, setLimit] = useState(3);
  const [selectedConfigs, setSelectedConfigs] = useState<Configuration[]>([
    ...CONFIGURATIONS,
  ]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [notice, setNotice] = useState("");
  const [resourceForm, setResourceForm] = useState({
    title: "",
    type: "note" as ResourceType,
    sourceUrl: "",
    content: "",
  });
  const [savingResource, setSavingResource] = useState(false);
  const [runningEvaluation, setRunningEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationRun | null>(null);

  const resourceCounts = useMemo(
    () =>
      resources.reduce<Record<string, number>>((counts, resource) => {
        counts[resource.type] = (counts[resource.type] ?? 0) + 1;
        return counts;
      }, {}),
    [resources],
  );

  async function loadResources(): Promise<void> {
    setResourcesLoading(true);
    try {
      const result = await api<{ resources: Resource[] }>("/api/resources");
      setResources(result.resources);
      setResourceError("");
    } catch (error) {
      setResourceError(
        error instanceof Error ? error.message : "Could not load resources",
      );
    } finally {
      setResourcesLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  function toggleConfiguration(configuration: Configuration): void {
    setSelectedConfigs((current) =>
      current.includes(configuration)
        ? current.filter((item) => item !== configuration)
        : [...current, configuration],
    );
  }

  async function runSearch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!query.trim() || selectedConfigs.length === 0) return;
    setSearching(true);
    setSearchError("");
    setNotice("");
    try {
      const [compareResult, answerResult] = await Promise.all([
        api<{ results: Comparison[] }>("/api/compare", {
          method: "POST",
          body: JSON.stringify({
            query,
            limit,
            configurations: selectedConfigs,
          }),
        }),
        api<{ answer: Answer }>("/api/answer/generate", {
          method: "POST",
          body: JSON.stringify({
            query,
            retrievalBudget: limit,
            configurations: selectedConfigs,
            includeCitations: true,
          }),
        }),
      ]);
      setComparisons(compareResult.results);
      setAnswer(answerResult.answer);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function saveResource(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setSavingResource(true);
    setResourceError("");
    try {
      const created = await api<{ resource: Resource }>("/api/resources", {
        method: "POST",
        body: JSON.stringify({
          ...resourceForm,
          sourceUrl: resourceForm.sourceUrl || undefined,
        }),
      });
      await api("/api/memories/rebuild", {
        method: "POST",
        body: JSON.stringify({ resourceIds: [created.resource.id] }),
      });
      const embeddings = await api<{ result: { errors: string[] } }>(
        "/api/embeddings/build",
        {
          method: "POST",
          body: JSON.stringify({
            resourceIds: [created.resource.id],
            representations: ["raw"],
          }),
        },
      );
      if (embeddings.result.errors.length > 0)
        throw new Error(embeddings.result.errors[0]);
      const summaries = await api<{ result: { errors: string[] } }>(
        "/api/summaries/build",
        {
          method: "POST",
          body: JSON.stringify({ resourceIds: [created.resource.id] }),
        },
      );
      if (summaries.result.errors.length > 0)
        throw new Error(summaries.result.errors[0]);
      const facts = await api<{ result: { errors: string[] } }>(
        "/api/facts/build",
        {
          method: "POST",
          body: JSON.stringify({ resourceIds: [created.resource.id] }),
        },
      );
      if (facts.result.errors.length > 0)
        throw new Error(facts.result.errors[0]);
      await api("/api/graph/build", {
        method: "POST",
        body: JSON.stringify({ resourceIds: [created.resource.id] }),
      });
      setResourceForm({ title: "", type: "note", sourceUrl: "", content: "" });
      await loadResources();
      setNotice("Resource added, chunked, and indexed.");
    } catch (error) {
      setResourceError(
        error instanceof Error ? error.message : "Could not save resource",
      );
    } finally {
      setSavingResource(false);
    }
  }

  async function seedDemo(): Promise<void> {
    setNotice("Loading the curated demo dataset…");
    try {
      const result = await api<{
        result: { resourcesCreated: number; resourcesSkipped: number };
      }>("/api/demo/seed", { method: "POST" });
      await api("/api/summaries/build", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await api("/api/facts/build", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await api("/api/graph/build", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadResources();
      setNotice(
        `${result.result.resourcesCreated} resources created; ${result.result.resourcesSkipped} already existed. Summaries, facts, and graph indexed.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Demo seed failed");
    }
  }

  async function runEvaluation(): Promise<void> {
    setRunningEvaluation(true);
    setNotice("");
    try {
      const result = await api<{ result: EvaluationRun }>(
        "/api/evaluation/run",
        {
          method: "POST",
          body: JSON.stringify({
            configurations: ["E1", "E2", "E3", "E4", "E5"],
            retrievalBudget: limit,
          }),
        },
      );
      setEvaluation(result.result);
      setNotice(`Evaluation ${result.result.runId.slice(0, 8)} completed.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Evaluation failed");
    } finally {
      setRunningEvaluation(false);
    }
  }

  const suggestions = [
    "What is caching?",
    "How does BM25 differ from vectors?",
    "How does LinkMind use pgvector?",
  ];

  return (
    <Tabs defaultValue="ask">
      <main className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>↗</div>
            <div>
              <strong>LinkMind</strong>
              <span>memory lab</span>
            </div>
          </div>
          <div className={styles.sidebarIntro}>
            <p className={styles.eyebrow}>RESEARCH CONSOLE</p>
            <h1>Turn scattered sources into useful memory.</h1>
            <p>
              Compare lexical, vector, summary, fact, and graph retrieval with
              evidence attached.
            </p>
          </div>
          <TabsList className={styles.nav}>
            <TabsTrigger value="ask" className={styles.navTrigger}>
              <span>⌕</span>Ask LinkMind
            </TabsTrigger>
            <TabsTrigger value="library" className={styles.navTrigger}>
              <span>▤</span>Resource library
            </TabsTrigger>
            <TabsTrigger value="evaluation" className={styles.navTrigger}>
              <span>◒</span>Evaluation
            </TabsTrigger>
          </TabsList>
          <div className={styles.sidebarFoot}>
            <span className={styles.statusDot} /> API connected at{" "}
            {API_URL.replace(/^https?:\/\//, "")}
          </div>
        </aside>

        <section className={styles.content}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.eyebrow}>WORKSPACE / PERSONAL MEMORY</p>
              <h2>Research workspace</h2>
            </div>
            <button
              className={styles.ghostButton}
              onClick={seedDemo}
              type="button"
            >
              ＋ Load demo data
            </button>
          </header>
          {notice && (
            <div className={styles.notice} role="status">
              <span>✓</span>
              {notice}
            </div>
          )}

          <TabsContent value="ask" className={styles.tabContent}>
            <section id="ask" className={styles.heroCard}>
              <div className={styles.sectionKicker}>
                <span>01</span> RETRIEVAL WORKBENCH
              </div>
              <div className={styles.heroHeading}>
                <div>
                  <h3>Ask a question.</h3>
                  <p>
                    See what each memory representation brings back—and why.
                  </p>
                </div>
                <div className={styles.livePill}>
                  <span /> LIVE INDEX
                </div>
              </div>
              <form
                onSubmit={runSearch}
                className={styles.queryForm}
                aria-busy={searching}
              >
                <textarea
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchError("");
                  }}
                  aria-label="Question"
                  rows={2}
                  placeholder="Ask about your sources…"
                />
                <div className={styles.queryControls}>
                  <div className={styles.configPicker}>
                    {CONFIGURATIONS.map((configuration) => (
                      <ConfigurationToggle
                        key={configuration}
                        configuration={configuration}
                        selected={selectedConfigs.includes(configuration)}
                        onToggle={() => toggleConfiguration(configuration)}
                      />
                    ))}
                    <label className={styles.limitLabel}>
                      Top{" "}
                      <select
                        value={limit}
                        onChange={(event) =>
                          setLimit(Number(event.target.value))
                        }
                        aria-label="Results per configuration"
                      >
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                      </select>
                    </label>
                  </div>
                  <button
                    className={styles.primaryButton}
                    disabled={
                      searching || selectedConfigs.length === 0 || !query.trim()
                    }
                  >
                    {searching ? (
                      <>
                        <span className={styles.spinner} /> Searching…
                      </>
                    ) : (
                      "Compare retrieval  →"
                    )}
                  </button>
                </div>
              </form>
              <div
                className={styles.suggestions}
                aria-label="Suggested questions"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {searchError && (
                <p className={styles.error} role="alert">
                  {searchError}
                </p>
              )}
            </section>

            {answer && (
              <section className={styles.answerCard} aria-live="polite">
                <div className={styles.answerLabel}>
                  <span className={styles.answerIcon}>✦</span>
                  <span>GROQ SYNTHESIS</span>
                  <span className={styles.answerMeta}>
                    {answer.latencyMs} ms ·{" "}
                    {answer.abstained ? "abstained" : "grounded"}
                  </span>
                </div>
                <p className={styles.answerText}>{answer.answer}</p>
                {answer.citations.length > 0 && (
                  <div className={styles.citationRow}>
                    {answer.citations.map((citation) =>
                      citation.sourceUrl ? (
                        <a
                          className={styles.citation}
                          key={citation.memoryId}
                          href={citation.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open original resource: ${citation.resourceTitle}`}
                        >
                          <span>↗</span>
                          <div>
                            <strong>{citation.resourceTitle}</strong>
                            <small>
                              {citation.evidenceText.slice(0, 120)}
                              {citation.evidenceText.length > 120 ? "…" : ""}
                            </small>
                          </div>
                        </a>
                      ) : (
                        <div
                          className={styles.citation}
                          key={citation.memoryId}
                        >
                          <span>↗</span>
                          <div>
                            <strong>{citation.resourceTitle}</strong>
                            <small>
                              {citation.evidenceText.slice(0, 120)}
                              {citation.evidenceText.length > 120 ? "…" : ""}
                            </small>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            )}

            <section className={styles.resultsSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>RETRIEVAL COMPARISON</p>
                  <h3>Five lenses on the same question</h3>
                </div>
                <span className={styles.muted}>
                  {comparisons.length
                    ? `${comparisons.length} configurations returned`
                    : "Run a question to populate results"}
                </span>
              </div>
              <div className={styles.comparisonGrid}>
                {comparisons.map((comparison) => (
                  <ComparisonPanel
                    comparison={comparison}
                    key={comparison.configuration}
                  />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="library" className={styles.tabContent}>
            <section id="library" className={styles.librarySection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>SOURCE COLLECTION</p>
                  <h3>Resource library</h3>
                </div>
                <div className={styles.libraryStats}>
                  <strong>{resources.length}</strong> sources <span>·</span>{" "}
                  {Object.entries(resourceCounts)
                    .map(
                      ([type, count]) =>
                        `${count} ${formatType(type as ResourceType)}`,
                    )
                    .join(" · ")}
                </div>
              </div>
              <div className={styles.libraryGrid}>
                <form className={styles.resourceForm} onSubmit={saveResource}>
                  <div className={styles.formTitle}>
                    Add a source <span>Paste text to make it retrievable.</span>
                  </div>
                  <input
                    required
                    placeholder="Title"
                    value={resourceForm.title}
                    onChange={(event) =>
                      setResourceForm({
                        ...resourceForm,
                        title: event.target.value,
                      })
                    }
                  />
                  <div className={styles.formRow}>
                    <select
                      value={resourceForm.type}
                      onChange={(event) =>
                        setResourceForm({
                          ...resourceForm,
                          type: event.target.value as ResourceType,
                        })
                      }
                      aria-label="Source type"
                    >
                      <option value="note">Note</option>
                      <option value="webpage">Webpage</option>
                      <option value="youtube_transcript">
                        YouTube transcript
                      </option>
                      <option value="github_readme">GitHub README</option>
                      <option value="paper_excerpt">Paper excerpt</option>
                    </select>
                    <input
                      placeholder="Source URL (optional)"
                      type="url"
                      value={resourceForm.sourceUrl}
                      onChange={(event) =>
                        setResourceForm({
                          ...resourceForm,
                          sourceUrl: event.target.value,
                        })
                      }
                    />
                  </div>
                  <textarea
                    required
                    placeholder="Source content…"
                    rows={7}
                    value={resourceForm.content}
                    onChange={(event) =>
                      setResourceForm({
                        ...resourceForm,
                        content: event.target.value,
                      })
                    }
                  />
                  <button
                    className={styles.secondaryButton}
                    disabled={savingResource}
                  >
                    {savingResource ? (
                      <>
                        <span className={styles.spinner} /> Saving…
                      </>
                    ) : (
                      "Add resource"
                    )}
                  </button>
                  {resourceError && (
                    <p className={styles.error} role="alert">
                      {resourceError}
                    </p>
                  )}
                </form>
                <div className={styles.resourceList}>
                  {resourcesLoading ? (
                    <div className={styles.loading}>
                      <span className={styles.spinnerDark} /> Loading sources…
                    </div>
                  ) : resources.length === 0 ? (
                    <div className={styles.loading}>
                      No resources yet. Load the demo dataset or add one.
                    </div>
                  ) : (
                    resources.slice(0, 8).map((resource) => (
                      <article
                        className={styles.resourceItem}
                        key={resource.id}
                      >
                        <div className={styles.resourceIcon}>
                          {resource.type === "note" ? "✎" : "▧"}
                        </div>
                        <div className={styles.resourceInfo}>
                          <strong title={resource.title}>
                            {resource.title}
                          </strong>
                          <span>
                            {formatType(resource.type)} ·{" "}
                            {resource.content.length.toLocaleString()} chars
                          </span>
                        </div>
                        {resource.sourceUrl ? (
                          <a
                            className={styles.arrow}
                            href={resource.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${resource.title}`}
                          >
                            ↗
                          </a>
                        ) : (
                          <span className={styles.arrow}>↗</span>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="evaluation" className={styles.tabContent}>
            <section id="evaluation" className={styles.evaluationSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>REPRODUCIBLE EVALUATION</p>
                  <h3>Measure the retrieval trade-offs</h3>
                </div>
                <button
                  className={styles.ghostButton}
                  disabled={runningEvaluation}
                  onClick={runEvaluation}
                  type="button"
                >
                  {runningEvaluation ? (
                    <>
                      <span className={styles.spinnerDark} /> Running…
                    </>
                  ) : (
                    "Run E1 + E2 + E3 + E4 + E5 evaluation"
                  )}
                </button>
              </div>
              {evaluation ? (
                <div className={styles.metricsGrid}>
                  {evaluation.configurations.map((configuration) => {
                    const metric = evaluation.aggregateMetrics[configuration];
                    return (
                      <div className={styles.metricCard} key={configuration}>
                        <span className={styles.configTag}>
                          {configuration}
                        </span>
                        <strong>
                          {metric
                            ? `${(metric.recallAt3 * 100).toFixed(0)}%`
                            : "—"}
                        </strong>
                        <span>Recall@3</span>
                        <small>
                          {metric
                            ? `MRR ${metric.mrr.toFixed(2)} · ${metric.avgLatencyMs} ms avg`
                            : "No metric returned"}
                        </small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.evaluationEmpty}>
                  Run the fixed 30-question dataset to save question-level
                  outcomes and aggregate metrics.
                </div>
              )}
            </section>
          </TabsContent>
          <footer className={styles.footer}>
            LinkMind / source-grounded memory research{" "}
            <span>Deterministic retrieval · evidence first</span>
          </footer>
        </section>
      </main>
    </Tabs>
  );
}
