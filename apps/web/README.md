# LinkMind web app

The LinkMind frontend is a Next.js application using the App Router and TypeScript. It uses a `LinkMindDataSource` interface in `lib/linkmind.ts`, with a mock implementation by default and an HTTP implementation when `NEXT_PUBLIC_LINKMIND_API_URL` is set.

Run it from the repository root with:

```bash
pnpm --filter web dev
```

Open `http://localhost:3000`. The three areas are tabs backed by the `tab` query parameter:

- `?tab=resources` for the resource library
- `?tab=ask` for the five-way retrieval comparison
- `?tab=evaluation` for the evaluation dashboard

The add-resource modal supports web pages, YouTube transcripts, GitHub READMEs, paper excerpts, notes, and automatic type detection from a URL. When `NEXT_PUBLIC_LINKMIND_API_URL` is set, resource list/create/detail calls use the implemented Express routes and translate their response envelopes and backend type slugs into frontend types. The resource detail view can call the implemented memory rebuild route and display its returned raw chunks. The developer seed action uses the implemented `/api/demo/seed` response shape.

The resource cards open a detail view with source content, memory representations, evidence, and reviewed/generated status. The evaluation screen can run the fixed evaluation set through the backend and export a persisted run as CSV.

The Ask screen uses `/api/compare` for all five retrieval configurations. If the comparison route is unavailable, it falls back to the local mock data source. The evaluation view reads the latest persisted run from `/api/evaluation/runs` and can start one with `/api/evaluation/run`. To use the HTTP adapter locally, set:

```env
NEXT_PUBLIC_LINKMIND_API_URL="http://localhost:4000"
```
