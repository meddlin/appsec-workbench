# Architecture

AppSec Workbench is a local-first AppSec control plane built as a TypeScript monorepo.

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

## Data Model

The initial Prisma schema lives in `packages/db/prisma/schema.prisma`.

- `Organization` stores GitHub owners and groups their repositories.
- `Repository` stores repository inventory records and links to one `RepositorySetting` record for security-relevant settings.
- `Control` defines the checks the system can evaluate.
- `ControlEvaluation` records the result of evaluating a control for a repository, optionally tied to a `ModuleRun`.
- `Finding` records actionable issues found on repositories, optionally tied to a control.
- `Exception` records approved suppressions for a repository, control, or finding.
- `ModuleRun` records ingestion or evaluation runs from the CLI.

## Version 1 Boundaries

- no GitHub webhooks
- no internal scheduler
- ingestion and evaluation run through the CLI
