# LinkMind — Long-Term Memory for Personal Digital Resources

> **Minor-project prototype and research experiment**  
> TypeScript · React · Node.js/Express · PostgreSQL · Prisma · pgvector

LinkMind explores how heterogeneous personal digital resources can be transformed into useful, source-grounded long-term memory for an AI assistant. It accepts text and metadata from resources such as webpages, YouTube transcript excerpts, GitHub READMEs, research-paper excerpts, and notes. It builds several memory representations, retrieves relevant evidence for a question, and compares retrieval performance across configurations.

**Project status:** Planned architecture / active development. Features described here are intended scope until they exist in code and pass tests. Do not present target dataset sizes, metrics, or expected behaviour as completed results.

## Coding-agent entry point

Before making code changes, read [`AGENTS.md`](./AGENTS.md). It contains repository-specific rules, frozen architecture decisions, implementation order, safety constraints, and the definition of done. [`agent.md`](./agent.md) points to the same instructions for tools that look for that filename.

For a coding task, first inspect the actual repository state, `package.json` scripts, Prisma schema and migrations, tests, and `git status`. The directory tree below is a target structure, not proof that every file already exists.

## Table of contents

- [Research objective](#research-objective)
- [MVP workflow](#mvp-workflow)
- [Architecture](#architecture)
- [Memory representations](#memory-representations)
- [Evaluation configurations](#evaluation-configurations)
- [Technology stack](#technology-stack)
- [Data model](#data-model)
- [Repository layout](#repository-layout)
- [Local development setup](#local-development-setup)
- [Planned API](#planned-api)
- [Evaluation methodology](#evaluation-methodology)
- [Team ownership](#team-ownership)
- [Implementation milestones](#implementation-milestones)
- [Scope boundaries and limitations](#scope-boundaries-and-limitations)
- [References](#references)

## Research objective

**Research question:** How can heterogeneous personal digital resources be transformed into useful long-term memory and effectively retrieved by an AI system?

The prototype investigates two related questions:

1. How does lexical retrieval compare with semantic retrieval over the same raw content?
2. How does memory representation—raw content, summaries, structured facts, or graph-linked facts—affect retrieval quality, evidence grounding, and efficiency?

LinkMind is an empirical prototype, not a claim that a particular memory representation is universally superior. Conclusions must follow from reproducible runs over the documented dataset.

## MVP workflow

1. **Load or add resources.** Each resource has a stable ID, title, type, optional source URL, and source text.
2. **Normalize and chunk text.** Preserve resource IDs and exact evidence passages; record ingestion failures rather than silently dropping content.
3. **Build memory.** Create raw-content chunks, summaries, atomic facts, and graph relationships between related fact nodes.
4. **Create embeddings.** Embed eligible memory text through a provider interface. Keep the model and dimensionality consistent for indexing and querying.
5. **Persist data.** Store resources, memory metadata, graph edges, embeddings, questions, runs, and results in PostgreSQL with pgvector.
6. **Retrieve.** Run BM25 or vector search. For graph-linked retrieval, expand candidate facts through a bounded, explicit graph policy.
7. **Show evidence.** Return the memory result, source resource, supporting passage, rank/score, and measured latency.
8. **Evaluate.** Run a fixed test set, calculate retrieval metrics, save question-level results, and export CSV.

The core query/retrieval/evaluation path must work without text generation. LLM-based summary generation, fact suggestions, or answer synthesis are optional enhancements, not a runtime requirement for the demo.

## Architecture

```mermaid
flowchart TD
    UI[React + TypeScript] --> API[Node.js + Express REST API]
    API --> ING[Resource ingestion and normalization]
    ING --> RAW[Raw text chunks]
    ING --> MEM[Memory formation service]
    MEM --> SUM[Summaries]
    MEM --> FACT[Structured facts]
    FACT --> EDGE[Graph relationships between facts]
    RAW --> EMB[Embedding service]
    SUM --> EMB
    FACT --> EMB
    EMB --> PG[(PostgreSQL + pgvector)]
    EDGE --> PG
    RAW --> PG
    SUM --> PG
    FACT --> PG
    API --> RET[Retrieval service]
    PG --> RET
    RET --> BM[BM25 lexical search]
    RET --> VEC[pgvector similarity search]
    RET --> GRAPH[Bounded graph expansion]
    BM --> EVID[Ranked results + source evidence]
    VEC --> EVID
    GRAPH --> EVID
    EVID --> UI
    API --> EVAL[Evaluation service]
    EVAL --> PG
    EVAL --> CSV[CSV export]
```

### Architecture rules

- **TypeScript first:** frontend, backend, retrieval algorithms, and evaluation logic use TypeScript.
- **One primary database:** PostgreSQL stores relational records and pgvector embeddings. Do not add Qdrant or another vector database.
- **Prisma for relational operations:** use Prisma for normal reads/writes. Isolate pgvector-specific SQL or extension APIs inside the vector repository.
- **Evidence is first-class:** every memory item must link to its source resource; preserve a supporting passage or source span wherever possible.
- **Graph is a relation layer:** graph-linked memory is structured fact nodes plus `MemoryEdge` relationships. Do not duplicate every fact into another table merely to label it as graph memory.
- **Comparable experiments:** use the same questions and documented top-K/budget across configurations. Record configuration details with each run.
- **Deterministic baseline:** BM25 and the evaluation metric calculations must not depend on an external LLM API.
- **Small, reproducible scope:** use a curated dataset and local development environment. Do not build a general-purpose web crawler or production agent platform for the MVP.

## Memory representations

| Representation | Stored content | Retrieval configuration |
|---|---|---|
| **Raw-content memory** | Source text split into chunks, with resource and evidence metadata | BM25 and dense vector search |
| **Summary-based memory** | Concise summary linked to its source resource | Dense vector search over summaries |
| **Structured-fact memory** | Atomic facts and entities linked to supporting source passages | Dense vector search over facts |
| **Graph-linked memory** | Structured fact nodes connected by explicit, typed edges | Vector search over facts followed by bounded graph expansion |

Use reviewed summaries, facts, and graph edges for the initial demo dataset so the expected evidence is known. For newly submitted resources, any automatically generated summaries/facts/edges are candidates until checked. Distinguish source text from generated abstractions in the data model and UI.

### Ingestion defaults

Start with pasted or pre-extracted text. Use a simple deterministic chunker, initially around 1,000 characters per chunk with around 150 characters of overlap. Treat these as configurable implementation defaults, not research findings. Preserve source offsets or evidence text so results can be traced to the original content. Do not add URL crawling, arbitrary PDF parsing, or YouTube transcription until the core loop works.

## Evaluation configurations

The initial pilot compares five configurations:

| ID | Configuration | Research purpose |
|---|---|---|
| **E1** | BM25 over raw-content chunks | Lexical retrieval baseline |
| **E2** | pgvector semantic search over raw-content chunks | Compare dense retrieval with E1 on the same source representation |
| **E3** | pgvector semantic search over summaries | Test the effect of summary-based memory |
| **E4** | pgvector semantic search over structured facts | Test atomic fact representation |
| **E5** | Vector search over facts plus graph expansion | Test whether explicit relationships help retrieval |

Use the same dataset and questions throughout. Keep the embedding model, text preprocessing, and retrieval budget consistent across E2–E5. E1 vs E2 changes the retrieval method; E2–E5 primarily investigate representation/graph strategy. Explain this distinction when interpreting results.

For graph expansion, start from a fixed number of vector-search candidates, follow one graph hop, deduplicate candidates, and apply a documented ranking policy. Do not keep tuning graph expansion against the test set after inspecting test results.

## Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, Vite, TypeScript | Resource library, query comparison, evaluation dashboard |
| Backend | Node.js, Express, TypeScript | REST API and application services |
| ORM | Prisma ORM | Relational models, CRUD operations, migrations |
| Database | PostgreSQL | Resources, memories, graph edges, questions, and results |
| Vector search | pgvector | Store embeddings and perform similarity search |
| Lexical search | BM25 implemented in TypeScript | Transparent retrieval baseline |
| Embeddings | Gemini embedding provider behind an interface | Embed documents and questions; provider can be replaced later |
| Optional generation | Gemini via an LLM-provider interface | Optional summary/fact generation and evidence-based answers |
| Validation | Zod | Validate incoming request data |
| Tests | Vitest | Unit and integration tests |
| Local database | Docker Compose | Reproducible PostgreSQL/pgvector environment |
| Export | CSV | Question-level experiment observations |

### Prisma and pgvector integration

Prisma support for pgvector depends on the Prisma major version and selected integration. Before implementing vector storage, inspect the repository's installed Prisma version and use one supported workflow consistently. Conventional Prisma Client projects can use a custom migration plus parameterized raw SQL for the pgvector column/query; newer Prisma extension workflows differ. **Do not mix APIs from different Prisma major versions or upgrade a working major version merely to change the vector integration.**

The vector-specific implementation belongs in one module such as `vector.repository.ts`. All other business logic should operate on ordinary TypeScript types and repository methods.

### Embedding configuration

Keep model name and vector dimension in configuration, not scattered constants. Choose a currently supported embedding model and confirm its returned dimensions before creating the database column. The database column dimension, document embeddings, and query embeddings must match. If the model or dimensions change, re-embed the indexed corpus before running comparisons. Cache demo embeddings where practical to reduce API calls and make the demo reliable.

## Data model

The intended relational model consists of these entities:

| Model/table | Purpose | Key requirements |
|---|---|---|
| `Resource` | Original source and metadata | Stable ID, type, title, optional URL, original content, creation timestamp |
| `MemoryItem` | Raw chunks, summaries, and fact nodes | Resource link, representation, content, evidence text/span, optional entities, optional embedding, provenance/status |
| `MemoryEdge` | Relations between fact nodes | Source fact, target fact, relation type, optional shared entity, provenance/confidence if inferred |
| `EvaluationQuestion` | Fixed test questions | Category, expected answer when answerable, answerability label |
| `ExpectedEvidence` | Gold sources/passages | Question link, expected resource ID, relevant passage or span |
| `ExperimentRun` | One full evaluation run | Timestamp, dataset version, app/retrieval config, embedding model/config |
| `ExperimentResult` | Per-question/configuration observations | Run/question links, configuration, relevant ranks, metrics, latency, returned IDs |

The exact Prisma model names can follow existing repository conventions. Use foreign keys, unique constraints, and indexes for common filters. Store vectors in pgvector and use the selected version's supported access pattern. Never interpolate user-controlled SQL fragments into raw queries; use parameterized queries or the extension's typed API.

## Repository layout

The intended layout is shown below. Existing code takes precedence over this proposal—do not move files solely to match the tree unless the task requires it.

```text
linkmind/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api/
│       └── types/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── ingestion.service.ts
│   │   │   ├── chunker.service.ts
│   │   │   ├── memory-builder.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   ├── retrieval.service.ts
│   │   │   ├── bm25.service.ts
│   │   │   ├── graph-retrieval.service.ts
│   │   │   └── evaluation.service.ts
│   │   ├── repositories/
│   │   │   ├── resource.repository.ts
│   │   │   ├── memory.repository.ts
│   │   │   └── vector.repository.ts
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
├── dataset/
│   ├── resources.json
│   └── questions.json
├── results/
│   └── observations.md
├── docs/
│   ├── architecture.md
│   └── demo-script.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── AGENTS.md
├── agent.md
└── README.md
```

## Local development setup

These steps describe the intended setup. Adapt commands to the scripts and files that actually exist in the repository; do not claim the application starts until the commands have been tested.

### Prerequisites

- Node.js compatible with the installed Vite and backend dependencies
- npm
- Docker Engine and Docker Compose
- Git
- A Gemini API key only for API-backed embedding or optional generation features

### 1. Clone the project

```bash
git clone <repository-url>
cd linkmind
```

### 2. Start PostgreSQL with pgvector

A minimal local `docker-compose.yml` can use the official pgvector image:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    container_name: linkmind-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: linkmind
      POSTGRES_PASSWORD: linkmind_local_dev
      POSTGRES_DB: linkmind
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - linkmind_pgdata:/var/lib/postgresql/data

volumes:
  linkmind_pgdata:
```

Start it with:

```bash
docker compose up -d db
```

This local Docker database is the **default and recommended target** for development, tests, and evaluation: it needs no secrets, works offline, and produces deterministic retrieval latency. A managed PostgreSQL 15+ service that provides the pgvector extension (for example Neon) may be used instead by pointing `DATABASE_URL` at it; keep that connection string out of Git. Set the same `DATABASE_URL` in `apps/api/.env` (used by the API) and `packages/db/.env` (used by the Prisma CLI).

These credentials are for local development only. Change them for any shared or deployed environment. The port is bound to localhost. Do not expose an unauthenticated development database to a public network.

### 3. Configure environment variables

Create the env file at the location expected by the backend and use `.env.example` as the template. Values will typically include:

```env
DATABASE_URL="postgresql://linkmind:linkmind_local_dev@localhost:5432/linkmind?schema=public"
PORT=4000
FRONTEND_ORIGIN="http://localhost:5173"
GEMINI_API_KEY=""
EMBEDDING_MODEL="<configured-model>"
EMBEDDING_DIMENSIONS="<configured-dimensions>"
```

The model and dimension placeholders must be replaced with a verified configuration. Keep `.env` out of Git, and never put the Gemini key in frontend code.

### 4. Install and run

After workspace files and npm scripts exist, use the scripts defined in each `package.json`. The conventional Prisma Client workflow commonly requires generating the client and applying migrations; the exact commands depend on the installed Prisma major version and scripts. For example, only where these scripts apply:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Expected development ports are `http://localhost:5173` for the frontend and `http://localhost:4000` for the backend unless the project configuration says otherwise. Add a health endpoint and verify the pgvector extension early in development.

## Planned API

These are planned endpoint contracts, not proof that the routes are implemented. Match actual handlers and validation schemas to the contract as features are added.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check API/database readiness as implemented |
| `POST` | `/api/demo/seed` | Load the synthetic demonstration dataset idempotently |
| `GET` | `/api/resources` | List resources |
| `POST` | `/api/resources` | Add resource text and metadata |
| `GET` | `/api/resources/:id` | Retrieve one resource and its memory items |
| `POST` | `/api/memories/rebuild` | Build representations and embeddings for selected resources |
| `POST` | `/api/query/compare` | Search all comparison configurations for one question |
| `POST` | `/api/evaluation/run` | Run the fixed evaluation set |
| `GET` | `/api/evaluation/runs/:id` | Retrieve metrics and question-level results |
| `GET` | `/api/evaluation/runs/:id.csv` | Export question-level results as CSV |

Query results should include the configuration, memory ID, resource ID/title, text, supporting evidence, rank/score, and retrieval latency. Keep generated answers separate from retrieval metadata so generation quality does not get confused with retrieval quality.

## Evaluation methodology

The planned pilot target is approximately **20 resources and 30 manually checked questions** across webpages, transcript excerpts, GitHub READMEs, paper excerpts, and synthetic notes. These are targets, not completed dataset counts until the files exist and the questions are verified.

Question categories should include:

- Direct factual recall
- Resource identification
- Cross-resource reasoning
- Temporal or version-sensitive questions
- Unanswerable questions where the dataset lacks sufficient evidence

For every answerable question, define its expected answer and one or more supporting source IDs/passages before running the evaluation. Prevent leakage by keeping answer keys out of prompts or retrieval indices where appropriate. Use the same questions across configurations and do not tune configurations after inspecting test results.

### Metrics

| Metric | Definition |
|---|---|
| **Recall@3** | Fraction of expected relevant resources retrieved within the top three. With multiple gold resources, count the fraction found in the top three. |
| **MRR** | Mean reciprocal rank of the first relevant result; zero when no relevant result is retrieved. |
| **Evidence correctness** | Whether retrieved evidence actually supports the answer; manually audit the pilot. |
| **Retrieval latency** | Elapsed retrieval time measured consistently on the same machine, excluding embedding API calls unless explicitly stated. |
| **Abstention behaviour** | Whether the system avoids asserting an unsupported answer when evidence is absent. |

Record question ID, configuration, expected evidence, retrieved resource IDs, first relevant rank, metric values, latency, and relevant configuration metadata. Report actual measurements only. Do not invent numbers or describe hypotheses as findings. State whether embedding API latency is included or excluded and use the same convention for all configurations.

## Team ownership

Suggested division for a three-person team:

| Owner | Primary responsibilities |
|---|---|
| **Backend / technical lead** | Architecture, Prisma models/migrations, pgvector integration, vector repository, retrieval API, and code integration |
| **Frontend owner** | Resource library, query comparison screen, evaluation dashboard, and API integration |
| **Dataset / evaluation owner** | Curated synthetic resources, expected answers/evidence, test runner integration, metric review, CSV, and demo preparation |

All members should test the integrated workflow. Agree on shared TypeScript types, database fields, and API response shapes before implementing components in parallel.

## Implementation milestones

- [ ] PostgreSQL + pgvector starts locally and migrations work.
- [ ] A resource can be created and persists across restart.
- [ ] Raw chunks, summaries, facts, and graph edges can be created with source links.
- [ ] Embeddings can be stored and searched through pgvector.
- [ ] BM25 works independently of any embedding or generation API.
- [ ] Graph retrieval follows explicit, bounded stored relationships.
- [ ] The UI compares methods for the same question.
- [ ] The evaluation set runs against all five configurations.
- [ ] Metrics and per-question results persist and export to CSV.
- [ ] Unanswerable questions and evidence support are checked.
- [ ] A fresh clone can be started using the verified README commands.

## Scope boundaries and limitations

- The initial version accepts pasted or pre-extracted text. It is not a general-purpose crawler or parser.
- The small pilot supports classroom demonstration and exploratory analysis; it cannot establish universal conclusions about agent memory.
- Automated summaries, facts, and edges can contain errors. Preserve provenance and label unverified data.
- Embedding model, preprocessing, and vector dimensions must match between indexing and search.
- Graph memory is implemented through relational edges over fact nodes, not a separate graph database.
- External APIs can be unavailable or rate-limited. The core retrieval and metric tests must be runnable with mocked embeddings and checked-in fixture data.
- Respect source copyright, usage terms, and consent. Use synthetic or explicitly consented data for personal notes; do not commit private notes or secrets.

## References

- [Prisma — PostgreSQL extensions](https://docs.prisma.io/docs/postgres/database/postgres-extensions)
- [Prisma — Using extensions](https://www.prisma.io/docs/orm/extensions/using-extensions)
- [pgvector — project and query operators](https://github.com/pgvector/pgvector)
- [Gemini embeddings documentation](https://ai.google.dev/gemini-api/docs/embeddings)
- [Vite documentation](https://vite.dev/guide/)
- [Vitest documentation](https://vitest.dev/guide/)

---

LinkMind is a research-oriented prototype for studying how memory representation and retrieval choices affect the usefulness of long-term memory over heterogeneous personal digital resources.
