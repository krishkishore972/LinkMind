"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import {
  dataSource,
  detectResourceType,
  resourceTypes,
  type CreateResourceInput,
  type EvaluationSnapshot,
  type Resource,
  type ResourceDetail,
  type ResourceType,
  type RetrievalConfiguration,
  type RetrievalResult,
} from "../lib/linkmind";

type Tab = "resources" | "ask" | "evaluation";
type LoadState = "loading" | "ready" | "error";

function Icon({
  name,
}: {
  name: "search" | "plus" | "arrow" | "external" | "file" | "sliders";
}) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6" />
        <path d="m20 4-9 9" />
        <path d="M18 13v6H5V6h6" />
      </>
    ),
    file: (
      <>
        <path d="M14 3H6v18h12V7Z" />
        <path d="M14 3v4h4" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
      </>
    ),
  } as const;
  return (
    <svg
      aria-hidden="true"
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className={styles.badge}>{children}</span>;
}

function useDialogFocus(open: boolean, close: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button, input, textarea, select, [href], [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements.at(0);
      const last = elements.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open]);
  return dialogRef;
}

function Header({
  tab,
  change,
  add,
}: {
  tab: Tab;
  change: (tab: Tab) => void;
  add: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>L</div>
        <div>
          <div className={styles.brandName}>LinkMind</div>
          <div className={styles.brandSub}>Research workspace</div>
        </div>
      </div>
      <nav className={styles.nav} aria-label="Primary navigation">
        {(["resources", "ask", "evaluation"] as const).map((item) => (
          <button
            key={item}
            className={`${styles.navItem} ${tab === item ? styles.navItemActive : ""}`}
            onClick={() => change(item)}
          >
            {item === "resources"
              ? "Resources"
              : item === "ask"
                ? "Ask LinkMind"
                : "Evaluation"}
          </button>
        ))}
      </nav>
      <button className={styles.addButton} onClick={add}>
        <Icon name="plus" /> <span>Add resource</span>
      </button>
    </header>
  );
}

function StatusMessage({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`stateCard ${error ? "stateError" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

function AddModal({
  close,
  save,
}: {
  close: () => void;
  save: (input: CreateResourceInput) => Promise<void>;
}) {
  const [type, setType] = useState<"Auto" | ResourceType>("Auto");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dialogRef = useDialogFocus(true, close);
  const detected = detectResourceType(source);
  const selectedType = type === "Auto" ? (detected ?? "Note") : type;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await save({
        title: title.trim(),
        type: selectedType,
        source: source.trim(),
        content: content.trim(),
      });
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Could not add this resource.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.eyebrow}>New source</div>
            <h2 id="add-title">Add a resource</h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div
          className={styles.typeTabs}
          role="tablist"
          aria-label="Resource type"
        >
          {(["Auto", ...resourceTypes] as const).map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={type === item}
              className={`${styles.typeTab} ${type === item ? styles.typeTabActive : ""}`}
              onClick={() => setType(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className={styles.resourceForm}>
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What are you saving?"
              required
            />
          </label>
          <label>
            URL <span className={styles.optional}>optional</span>
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="https://..."
            />
          </label>
          {type === "Auto" && detected && (
            <div className={styles.detectedHint}>
              ● Detected as <strong>{detected}</strong> from this URL
            </div>
          )}
          {type === "Auto" && !detected && source && (
            <div className={styles.detectedHintMuted}>
              ● Add a valid URL to detect the resource type
            </div>
          )}
          <label>
            Content
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste the source text or a note here..."
              rows={7}
              required
            />
          </label>
          {saveError && (
            <div className="formError" role="alert">
              {saveError}
            </div>
          )}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving ? "Adding..." : "Add resource"}{" "}
              {!saving && <Icon name="arrow" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ResourceDetailModal({
  detail,
  loading,
  error,
  close,
  retry,
}: {
  detail: ResourceDetail | null;
  loading: boolean;
  error: string;
  close: () => void;
  retry: () => void;
}) {
  const dialogRef = useDialogFocus(true, close);
  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        ref={dialogRef}
        className={`${styles.modal} detailModal`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-detail-title"
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.eyebrow}>Resource detail</div>
            <h2 id="resource-detail-title">
              {detail?.title ?? "Loading resource"}
            </h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {loading || !detail ? (
          <StatusMessage>
            {error ? (
              <>
                <span>{error}</span>{" "}
                <button className="retryButton" onClick={retry}>
                  Retry
                </button>
              </>
            ) : (
              "Loading source and memory items..."
            )}
          </StatusMessage>
        ) : (
          <>
            <div className="detailMeta">
              <Badge>{detail.type}</Badge>
              <span>{detail.source || "Local note"}</span>
            </div>
            <div className="detailSource">
              <span className="detailLabel">Source content</span>
              <p>{detail.content}</p>
            </div>
            <div className="memoryList">
              <div className="detailLabel">Memory items</div>
              {detail.memoryItems.map((item) => (
                <article className="memoryItem" key={item.id}>
                  <div className="memoryItemTop">
                    <Badge>{item.representation}</Badge>
                    <span
                      className={
                        item.status === "generated"
                          ? "generatedLabel"
                          : "reviewedLabel"
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                  <p>{item.content}</p>
                  <small>Evidence: {item.evidence}</small>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ResourcesView({
  resources,
  add,
  open,
}: {
  resources: Resource[];
  add: () => void;
  open: (resource: Resource) => void;
}) {
  return (
    <main className={styles.content}>
      <div className={styles.pageIntro}>
        <div>
          <div className={styles.eyebrow}>
            Collection / {resources.length} sources
          </div>
          <h1>Your resources</h1>
          <p>Source material that LinkMind can turn into searchable memory.</p>
        </div>
        <button className={styles.secondaryButton} onClick={add}>
          <Icon name="plus" /> Add resource
        </button>
      </div>
      <div className={styles.resourceGrid}>
        {resources.map((item) => (
          <article
            className={styles.resourceCard}
            key={item.id}
            onClick={() => open(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") open(item);
            }}
            tabIndex={0}
            role="button"
          >
            <div className={styles.resourceTop}>
              <div className={styles.resourceIcon}>
                <Icon name="file" />
              </div>
              <Badge>{item.type}</Badge>
              <button
                className={styles.moreButton}
                aria-label={`More actions for ${item.title}`}
                onClick={(event) => event.stopPropagation()}
              >
                •••
              </button>
            </div>
            <h2>{item.title}</h2>
            <div className={styles.resourceSource}>
              {item.source || "Local note"} <Icon name="external" />
            </div>
            <p>{item.excerpt}</p>
            <div className={styles.resourceFooter}>
              <span>{item.added}</span>
              <span className={styles.memoryReady}>● Memory ready</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function ResultCard({ result }: { result: RetrievalResult }) {
  return (
    <article className={styles.resultCard}>
      <div className={styles.resultMeta}>
        <span className={styles.rank}>0{result.rank}</span>
        <Badge>{result.memoryType}</Badge>
        <span className={styles.score}>
          Score <strong>{result.score}</strong>
        </span>
      </div>
      <h3>{result.resourceTitle}</h3>
      <p className={styles.resultContent}>{result.content}</p>
      <div className={styles.evidence}>
        <span>Evidence</span>
        <p>“{result.evidence}”</p>
      </div>
      <div className={styles.resultFooter}>
        <span>{result.latency} retrieval</span>
        <span>
          Source-grounded <b>✓</b>
        </span>
      </div>
    </article>
  );
}

function exportEvaluationCsv(snapshot: EvaluationSnapshot): void {
  const header = [
    "configuration",
    "recall_at_3",
    "mrr",
    "latency",
    "evidence_correctness",
  ];
  const rows = snapshot.rows.map((row) => [
    row.configuration,
    row.recallAt3,
    row.mrr,
    row.latency,
    row.evidenceCorrectness,
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell);
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `linkmind-${snapshot.datasetVersion}-evaluation.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AskView() {
  const questions: [string, string, string] = [
    "How should a personal knowledge system decide what to recall?",
    "What role does evidence play in assistant memory?",
    "How does pgvector fit into LinkMind?",
  ];
  const [question, setQuestion] = useState(questions[0]);
  const [submitted, setSubmitted] = useState(questions[0]);
  const [configurations, setConfigurations] = useState<
    RetrievalConfiguration[]
  >([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const compare = async (nextQuestion: string) => {
    const requestId = ++requestRef.current;
    setState("loading");
    setError("");
    try {
      const result = await dataSource.compareQuery(nextQuestion);
      if (requestId !== requestRef.current) return;
      setConfigurations(result);
      setSubmitted(nextQuestion);
      setState("ready");
    } catch (cause) {
      if (requestId !== requestRef.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not compare the question.",
      );
      setState("error");
    }
  };
  useEffect(() => {
    void compare(questions[0]);
  }, []);
  return (
    <main className={styles.content}>
      <div className={styles.askIntro}>
        <div>
          <div className={styles.eyebrow}>Retrieval comparison</div>
          <h1>Ask LinkMind</h1>
          <p>Run the same question through five memory configurations.</p>
        </div>
        <div className={styles.queryStatus}>
          ●{" "}
          {process.env.NEXT_PUBLIC_LINKMIND_API_URL
            ? "API data"
            : "Mock dataset"}
        </div>
      </div>
      <form
        className={styles.askForm}
        onSubmit={(event) => {
          event.preventDefault();
          void compare(question);
        }}
      >
        <div className={styles.searchIcon}>
          <Icon name="search" />
        </div>
        <input
          aria-label="Question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          type="submit"
          className={styles.askButton}
          disabled={state === "loading"}
        >
          Compare <Icon name="arrow" />
        </button>
      </form>
      <div className={styles.suggestionRow}>
        <span>Try a question</span>
        {questions.map((item) => (
          <button
            key={item}
            onClick={() => {
              setQuestion(item);
              void compare(item);
            }}
          >
            {item}
          </button>
        ))}
      </div>
      {state === "error" ? (
        <StatusMessage error>{error}</StatusMessage>
      ) : (
        <>
          <div className={styles.queryHeading}>
            <div>
              <span className={styles.askedLabel}>QUESTION</span>
              <h2>{submitted}</h2>
            </div>
            <button className={styles.filterButton}>
              <Icon name="sliders" /> Retrieval settings
            </button>
          </div>
          {state === "loading" ? (
            <StatusMessage>
              Comparing five retrieval configurations...
            </StatusMessage>
          ) : (
            <div className={styles.configGrid}>
              {configurations.map((config) => (
                <section
                  className={`${styles.configPanel} ${styles[`tone${config.tone.charAt(0).toUpperCase()}${config.tone.slice(1)}`]}`}
                  key={config.id}
                >
                  <div className={styles.configHeader}>
                    <div>
                      <span className={styles.configId}>{config.id}</span>
                      <h2>{config.title}</h2>
                      <p>{config.description}</p>
                    </div>
                    <span className={styles.configLatency}>
                      {config.results[0]?.latency}
                    </span>
                  </div>
                  <div className={styles.results}>
                    {config.results.map((result) => (
                      <ResultCard
                        key={`${config.id}-${result.rank}`}
                        result={result}
                      />
                    ))}
                  </div>
                  <button className={styles.panelLink}>
                    View all results <Icon name="arrow" />
                  </button>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function EvaluationView() {
  const [snapshot, setSnapshot] = useState<EvaluationSnapshot | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  useEffect(() => {
    void dataSource
      .getEvaluation()
      .then((value) => {
        setSnapshot(value);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);
  if (state === "loading")
    return (
      <main className={styles.content}>
        <StatusMessage>Loading evaluation summary...</StatusMessage>
      </main>
    );
  if (state === "error" || !snapshot)
    return (
      <main className={styles.content}>
        <StatusMessage error>
          Evaluation data is not available yet.
        </StatusMessage>
      </main>
    );
  const summary: [string, string, string][] = [
    [
      "Latest run",
      snapshot.runLabel,
      "Mock values shown for interface planning",
    ],
    ["Questions", String(snapshot.questionCount), "Fixed evaluation set"],
    [
      "Configurations",
      String(snapshot.configurationCount),
      "Same budget across runs",
    ],
    ["Dataset", snapshot.datasetVersion, "Synthetic resources"],
  ];
  return (
    <main className={styles.content}>
      <div className={styles.pageIntro}>
        <div>
          <div className={styles.eyebrow}>
            Experiment / pilot-{snapshot.datasetVersion}
          </div>
          <h1>Evaluation</h1>
          <p>Compare retrieval quality on the fixed LinkMind question set.</p>
        </div>
        <button className={styles.secondaryButton} disabled>
          Run evaluation <small>Later</small>
        </button>
      </div>
      <section className={styles.evalSummary}>
        {summary.map(([label, value, sub]) => (
          <div key={label}>
            <span className={styles.metricLabel}>{label}</span>
            <strong>{value}</strong>
            <span className={styles.metricSub}>{sub}</span>
          </div>
        ))}
      </section>
      <section className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Configuration results</h2>
            <p>Illustrative values until the evaluation route is connected.</p>
          </div>
          <button
            className={styles.exportButton}
            onClick={() => exportEvaluationCsv(snapshot)}
          >
            Export CSV <Icon name="arrow" />
          </button>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Configuration</th>
                <th>Recall@3</th>
                <th>MRR</th>
                <th>Latency</th>
                <th>Evidence correctness</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.rows.map((row) => (
                <tr key={row.configuration}>
                  <td>
                    <strong>{row.configuration}</strong>
                  </td>
                  <td>{row.recallAt3}</td>
                  <td>{row.mrr}</td>
                  <td>{row.latency}</td>
                  <td>{row.evidenceCorrectness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const rawTab = params.get("tab");
  const tab: Tab =
    rawTab === "ask" || rawTab === "evaluation" ? rawTab : "resources";
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceState, setResourceState] = useState<LoadState>("loading");
  const [modal, setModal] = useState(false);
  const [selectedResource, setSelectedResource] =
    useState<ResourceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Resource | null>(null);
  const [detailError, setDetailError] = useState("");
  const detailRequestRef = useRef(0);
  useEffect(() => {
    void dataSource
      .listResources()
      .then((value) => {
        setResources(value);
        setResourceState("ready");
      })
      .catch(() => setResourceState("error"));
  }, []);
  const saveResource = async (input: CreateResourceInput) => {
    const resource = await dataSource.addResource(input);
    setResources((current) => [resource, ...current]);
    setModal(false);
  };
  const openResource = async (resource: Resource) => {
    const requestId = ++detailRequestRef.current;
    setDetailTarget(resource);
    setSelectedResource(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const detail = await dataSource.getResource(resource.id);
      if (requestId === detailRequestRef.current) setSelectedResource(detail);
    } catch (cause) {
      if (requestId === detailRequestRef.current)
        setDetailError(
          cause instanceof Error
            ? cause.message
            : "Could not load this resource.",
        );
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    detailRequestRef.current += 1;
    setSelectedResource(null);
    setDetailTarget(null);
    setDetailError("");
    setDetailLoading(false);
  };
  const changeTab = (next: Tab) => router.push(`${pathname}?tab=${next}`);
  return (
    <div className={styles.app}>
      <Header tab={tab} change={changeTab} add={() => setModal(true)} />
      {tab === "resources" ? (
        resourceState === "loading" ? (
          <main className={styles.content}>
            <StatusMessage>Loading resources...</StatusMessage>
          </main>
        ) : resourceState === "error" ? (
          <main className={styles.content}>
            <StatusMessage error>
              Resources are not available yet.
            </StatusMessage>
          </main>
        ) : (
          <ResourcesView
            resources={resources}
            add={() => setModal(true)}
            open={openResource}
          />
        )
      ) : tab === "ask" ? (
        <AskView />
      ) : (
        <EvaluationView />
      )}
      <footer className={styles.footer}>
        <span>
          LinkMind <i>·</i> Research prototype
        </span>
        <span>
          Evidence first <b>✓</b>
        </span>
      </footer>
      {modal && <AddModal close={() => setModal(false)} save={saveResource} />}
      {(detailLoading || selectedResource || detailError) && (
        <ResourceDetailModal
          detail={selectedResource}
          loading={detailLoading}
          error={detailError}
          retry={() => {
            if (detailTarget) void openResource(detailTarget);
          }}
          close={closeDetail}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className={styles.app} />}>
      <HomeContent />
    </Suspense>
  );
}
