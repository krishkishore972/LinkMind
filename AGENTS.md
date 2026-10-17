# AGENTS.md — LinkMind Coding Instructions

These instructions apply to the entire repository unless a deeper `AGENTS.md` provides narrower rules. Read this file before coding. Use `README.md` for the product goal and planned architecture, but treat the checked-in source code, package manifests, tests, Prisma schema, and migrations as the source of truth for what currently exists.

## 1. Mission and priorities

Build a small, reproducible research prototype that demonstrates how heterogeneous personal digital resources become source-grounded memory and how different retrieval configurations compare.

Optimise for this order:

1. Correct, runnable end-to-end vertical slices.
2. Evidence provenance and reproducible evaluation.
3. Tests and clear error handling.
4. A simple UI that demonstrates the work.
5. Optional LLM features and polish.

Do not optimise for production-scale throughput, architectural novelty, or feature count. The submission deadline is short; avoid scope expansion.

## 2. Frozen architecture decisions

Do not change these without an explicit user request:

- Language: TypeScript for frontend, backend, retrieval, and evaluation.
- Frontend: React + Vite.
- Backend: Node.js + Express REST API.
- Relational database and vector storage: PostgreSQL + pgvector.
- ORM: Prisma ORM for ordinary relational operations.
- Lexical baseline: a deterministic BM25 implementation in TypeScript.
- Embeddings: provider behind an interface; Gemini may be the initial provider.
- Input validation: Zod.
- Tests: Vitest.
- Evaluation outputs: persisted question-level results and CSV export.
- No Qdrant, separate vector database, Redis, Kafka, microservices, dedicated graph database, Kubernetes, browser extension, or general-purpose crawler in the MVP.

Use a single, coherent Prisma integration compatible with the version already installed. Prisma pgvector integration differs by major version. Inspect `package.json`, lockfile, and Prisma configuration first; do not mix APIs or upgrade a working major version merely to change integration style. Put vector-specific SQL/API calls behind `vector.repository.ts` (or the existing equivalent).

## 3. Research contract

The main question is:

> How can heterogeneous personal digital resources be transformed into useful long-term memory and effectively retrieved by an AI system?

The four conceptual memory representations are:

1. **Raw-content:** chunks derived from original resource text.
2. **Summary:** concise summaries linked to the source resource.
3. **Structured facts:** atomic facts linked to source evidence.
4. **Graph-linked facts:** structured fact nodes plus explicit typed edges connecting related facts/resources.

Graph-linked memory is a relationship layer over fact nodes. Do not duplicate every fact into a second set of memory rows solely to label it graph memory. Keep the graph edges and provenance explicit.

The five planned evaluation configurations are:

- E1: BM25 over raw chunks.
- E2: pgvector vector search over raw chunks.
- E3: vector search over summaries.
- E4: vector search over structured facts.
- E5: vector search over facts plus bounded graph expansion.

Keep E1 vs E2 interpretation separate from E2–E5: the first comparison changes retrieval method; the later comparisons focus more on representation/graph strategy. Do not claim one approach is superior before measuring it.

## 4. Mandatory working workflow

For every task:

1. **Inspect before editing.** Read this file and the relevant README section. Inspect `git status --short`, existing files, package scripts, types, schema/migrations, and related tests. Do not overwrite unrelated user changes.
2. **Define a narrow outcome.** Implement the smallest vertical slice that completes the request. Avoid broad refactors and unrelated dependencies.
3. **Follow existing conventions.** Prefer existing modules and naming. Do not create duplicate service/repository abstractions if equivalent ones exist.
4. **Make one coherent change.** Keep business logic separate from HTTP handlers, persistence, provider code, and UI rendering.
5. **Test at the right level.** Run targeted tests first, then relevant integration/build checks. Use the exact scripts that exist; do not assume scripts are configured.
6. **Inspect the diff.** Check `git diff --check`, review changed files, and ensure no secrets, generated build output, local database files, or unrelated edits are included.
7. **Report honestly.** Summarise what changed, list tests actually run and their outcomes, and call out unimplemented parts or blockers. Never claim a feature or test passed without evidence.

If a task's detail is unclear, inspect existing code and choose the smallest option consistent with these decisions. State important assumptions in the final summary rather than implementing speculative features.

## 5. Implementation order

Prefer this order unless an existing repository state makes another sequence clearly safer:

1. Verify Node/npm, repository scripts, and PostgreSQL/pgvector connection.
2. Establish environment validation, server health, Prisma setup, and schema migrations.
3. Implement Resource CRUD and idempotent synthetic demo seeding.
4. Implement deterministic text normalization and chunking with provenance.
5. Implement memory builders for raw chunks, summaries, facts, and typed graph edges. Use checked-in/curated fixture data for verified summaries/facts; simple deterministic extraction can be a fallback for new text.
6. Implement BM25 and unit tests without any external API dependency.
7. Implement the embedding-provider interface and pgvector save/search path. Test with a mock/fake embedding provider before using live Gemini.
8. Implement bounded graph expansion over retrieved fact nodes.
9. Implement query comparison API and source-grounded result shape.
10. Implement fixed-dataset evaluation, metrics, persisted run history, and CSV.
11. Connect the React resource, query-comparison, and evaluation screens.
12. Verify a clean local start, tests, seed flow, demo script, and README.

Do not build all frontend screens before the API contracts and one vertical slice work end to end.

## 6. TypeScript and code quality

- Prefer strict TypeScript and explicit return types for exported/public functions.
- Avoid `any`. If a third-party boundary forces an unknown shape, use `unknown` and validate/narrow it.
- Validate all external input at API boundaries with Zod or an existing validation layer.
- Use central error middleware and consistent JSON error responses; do not leak stack traces or secrets to clients.
- Keep Express routes thin. Put logic in services and database access in repositories, following the existing project structure.
- Do not add abstractions for one-off trivial expressions. Add interfaces where they enable testability or isolate a provider/database-specific capability.
- Use async/await and handle rejected promises. Do not silently swallow exceptions.
- Keep UI state and API response types explicit. Show empty, loading, and error states for core screens.
- Add a dependency only if it supports an agreed requirement. Check whether an existing package already solves the problem.
- Follow the existing formatter/linter configuration if present; do not introduce a second formatter or linter.

## 7. Database and pgvector rules

- Use Prisma for ordinary relational reads/writes and the established project migration workflow for schema changes.
- Any pgvector raw SQL must be parameterized. Never concatenate query text, IDs, vector values, or user-controlled fragments into executable SQL.
- Isolate custom vector operations in one repository/module. Do not scatter `$queryRaw`/`$executeRaw` calls through routes or UI-facing services.
- Keep embedding model and dimensionality in validated configuration. Validate output dimensions before writes/search.
- The stored vector column, document vectors, and query vectors must use compatible dimensions and model/preprocessing.
- Use an explicit source ID/evidence relationship for each memory item. A generated summary/fact is not a substitute for the original source passage.
- Apply foreign keys, unique constraints, and useful indexes when consistent with the existing schema.
- Never run `prisma migrate reset`, drop tables, truncate user data, delete volumes, or run destructive database commands without explicit approval. Prefer additive migrations and explain any data-impacting operation.
- Do not make approximate indexes a requirement for the small pilot. Start with exact vector search unless measurements justify HNSW/IVFFlat.
- Make demo seeding idempotent: running it twice must not create duplicate resources, questions, or expected-evidence rows.

## 8. Provenance, retrieval, and answer behaviour

- Every returned memory result must include the originating resource ID/title and a supporting passage or evidence text wherever available.
- Keep source text, generated summaries/facts, and inferred graph edges distinguishable in storage and, where relevant, UI.
- Label unverified generated summaries/facts/edges as generated or unverified; do not imply human validation that has not occurred.
- The core workflow must remain usable when `GEMINI_API_KEY` is absent or the provider is unavailable. BM25, fixture-based memory, retrieval metrics, and tests cannot require a live external API.
- Use an embedding interface with a fake/mock implementation for unit/integration tests. Never call a paid or rate-limited API from routine tests unless a test is explicitly marked as an opt-in integration test.
- For graph retrieval, use a documented and bounded expansion policy (initial candidates, hop count, deduplication, ranking, result limit). Avoid unbounded recursive traversal.
- Generated answers must be grounded in retrieved evidence and should abstain when the collection does not support a claim. Preserve retrieval evidence separately from the final answer.
- Do not use a model-generated answer as the sole ground truth for evaluation.

## 9. Evaluation rules

Initial planned pilot: approximately 20 synthetic/permissioned resources and 30 manually checked questions. These counts are targets until fixture files exist and are verified.

Required configurations: E1 BM25/raw; E2 vector/raw; E3 vector/summary; E4 vector/fact; E5 vector/fact + graph expansion.

Metrics:

- Recall@3, accounting for multiple expected relevant resources.
- MRR, using the rank of the first relevant result and zero where no relevant result appears.
- Evidence correctness, manually audited for the pilot.
- Retrieval latency measured consistently; state whether embedding API time is included.
- Abstention behaviour for unanswerable questions.

Evaluation requirements:

- Gold expected answers/evidence must be prepared before examining model output.
- Same fixed questions and clearly documented retrieval budgets across configurations.
- Preserve each raw per-question outcome; calculate aggregate metrics from those records.
- Store dataset version and relevant retrieval/embedding configuration per experiment run.
- Repeatable configurations must produce stable rankings/metrics when using deterministic local inputs.
- Never invent observations, fill expected results as if measured, or tune using the held-out test set.
- Use synthetic notes or data with explicit consent. Do not commit private personal notes or copyrighted source dumps.

## 10. API and UI conventions

Planned routes include:

- `GET /api/health`
- `POST /api/demo/seed`
- `GET /api/resources`
- `POST /api/resources`
- `GET /api/resources/:id`
- `POST /api/memories/rebuild`
- `POST /api/query/compare`
- `POST /api/evaluation/run`
- `GET /api/evaluation/runs/:id`
- `GET /api/evaluation/runs/:id.csv`

Treat these as contracts to implement, not proof they already exist. Inspect current routes before adding an endpoint and adapt naming only if the codebase already established a coherent convention.

A comparison response should identify each configuration and provide ranked items with `memoryId`, `resourceId`, `resourceTitle`, `content`, `evidenceText`, `score`, `rank`, and `latencyMs` (or the existing project's equivalent names). Make sure backend and frontend share these types. Do not report retrieval latency that accidentally includes unrelated work unless it is explicitly labelled end-to-end latency.

The UI only needs three core areas: resource library/add-resource form; Ask LinkMind with four comparison panels; evaluation results with aggregate metrics and CSV export. Avoid adding authentication, collaboration permissions, or advanced graph visualisation for the MVP.

## 11. Secrets, files, and Git hygiene

- Never hard-code or commit API keys, passwords, production connection strings, private source text, or user personal notes.
- Keep `.env`, local PostgreSQL storage, generated embeddings cache if private, build output, `node_modules`, and local result artifacts out of Git according to `.gitignore`.
- Maintain `.env.example` with placeholder values only.
- Do not edit or delete user work outside the requested task.
- Do not use broad destructive shell commands or change Git history.
- Avoid editing generated Prisma client files directly.
- Do not claim code is committed or pushed unless the command was actually run and succeeded.

## 12. Tests and definition of done

At minimum, add tests for the behaviour being changed. Important eventual test coverage includes:

- Normalization and chunking preserve resource/evidence links.
- BM25 ranks a known relevant fixture and handles empty queries/collections.
- Memory builders persist expected representation types with provenance.
- Vector repository validates dimensions and ranks a controlled fixture using fake embeddings or a test database.
- Graph expansion is bounded, deduplicated, and source-grounded.
- Recall@3 and MRR calculations cover rank-1, rank-2, missing-result, and multi-gold cases.
- Unanswerable test questions are represented correctly.
- Demo seeding is idempotent.
- API validation and error handling reject malformed inputs.

For each task:

1. Run the closest unit tests.
2. Run relevant integration tests if PostgreSQL is available.
3. Run typecheck/build/test scripts that actually exist.
4. Run `git diff --check` and review the final diff.

If a database, provider, or dependency is unavailable, run the available offline tests and report the blocked check clearly. Do not downgrade or skip tests silently.

The MVP is done when a fresh local setup can load the prepared data, create all memory structures, compare the five configurations, display evidence for results, run the 30-question pilot (once prepared), save run results, and export CSV—without requiring an LLM generation API to be available.

## 13. Final response format for coding tasks

When finishing a task, report concisely:

1. **Implemented:** the behaviours/files changed.
2. **Validation:** exact tests/commands run and pass/fail status.
3. **Limitations:** anything not implemented, not tested, or dependent on credentials/database.
4. **Next step:** at most one concrete follow-up if a blocker remains.

Do not provide a lengthy narration of internal reasoning. Prefer actionable summaries backed by the actual code and test output.
