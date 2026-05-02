# GitHub Inventory

GitHub Inventory is a local-first AppSec control plane for indie developers and small teams.

This repository is a TypeScript monorepo managed with pnpm workspaces. It will contain:

- a CLI for GitHub ingestion and compliance evaluation
- a Next.js web app for inventory and findings workflows
- shared packages for database access, GitHub integration, module contracts, core types, and policy logic

## Workspace Layout

```text
apps/
  cli/
  web/
packages/
  core/
  db/
  github/
  modules/
  policies/
docs/
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run workspace checks:

```bash
pnpm typecheck
```

## First Milestone

The first milestone is a working skeleton that can:

1. start Postgres with Docker Compose
2. run Prisma migrations
3. run a CLI command
4. start a Next.js web app
5. share code through local workspace packages

Business logic has not been implemented yet.
