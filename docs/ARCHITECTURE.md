# Architecture

GitHub Inventory is a local-first AppSec control plane built as a TypeScript monorepo.

## Applications

- `apps/cli`: owns ingestion, evaluation, scheduled command entrypoints, and seed/demo commands
- `apps/web`: owns dashboards, repository views, finding views, control views, exception management, and module run history views

The web app does not perform GitHub ingestion. Scheduled jobs are expected to be handled by host cron or systemd timers calling the CLI.

## Packages

- `packages/core`: shared domain types and utilities
- `packages/db`: Prisma schema and typed database access
- `packages/github`: GitHub API client code
- `packages/modules`: AppSec module contracts and registry
- `packages/policies`: policy definitions and evaluation helpers

## Module Pattern

AppSec capabilities are implemented as modules. A module can define:

- `id`
- `name`
- `description`
- optional `ingest` function
- optional `evaluate` function

The CLI will run modules through the module registry.

## Persistence

Postgres is the local datastore. Prisma will provide the schema, migrations, and typed database access.

## Version 1 Boundaries

- no GitHub webhooks
- no internal scheduler
- ingestion and evaluation run through the CLI
