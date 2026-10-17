# LinkMind Agent Instructions

Before implementing any task in this repository, read and follow [`AGENTS.md`](./AGENTS.md). It is the canonical source for project architecture, coding conventions, frozen technology choices, implementation order, evaluation rules, safety constraints, and definition of done.

Use [`README.md`](./README.md) for the project goal, architecture overview, intended API, and local setup. These documents describe intended scope; inspect the actual code, package scripts, Prisma schema/migrations, and tests before assuming a feature exists.

Priorities: keep changes small and runnable, preserve source evidence/provenance, keep the deterministic baseline independent of live LLM APIs, add or update tests, run available checks, inspect `git diff`, and report exactly what was verified. Do not add infrastructure or change the agreed stack without an explicit request.
