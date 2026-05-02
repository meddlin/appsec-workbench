# AGENTS.md

## Project purpose

This project is a local-first AppSec control plane for indie developers and small teams.

It has:
- a CLI for GitHub data ingestion and compliance evaluation
- a web app for viewing repository inventory, findings, controls, exceptions, and run history
- Postgres for local storage
- shared TypeScript packages for database access, GitHub API access, core types, module contracts, and policy logic

## Architecture decisions

Use a TypeScript monorepo with pnpm workspaces.

Initial apps:
- apps/cli
- apps/web

Initial packages:
- packages/db
- packages/core
- packages/github
- packages/modules
- packages/policies

Use Postgres for storage.

Use Prisma for database schema and typed database access.

Use Next.js for the web app.

Use the CLI as the ingestion and evaluation runner.

Do not implement GitHub webhooks in v1.

Do not implement an internal scheduler in v1.

Scheduled jobs should be handled by host cron or systemd timers calling the CLI.

## App boundaries

The CLI owns:
- ingestion
- evaluation
- scheduled command entrypoints
- seed/demo commands

The web app owns:
- dashboards
- repository views
- finding views
- control views
- exception management
- module run history views

The web app should not perform GitHub ingestion.

Shared packages own reusable logic.

## Module pattern

AppSec capabilities should be implemented as modules.

A module can have:
- id
- name
- description
- optional ingest function
- optional evaluate function

The CLI should run modules through a module registry.

## Coding expectations

Prefer simple, explicit code.

Avoid premature abstraction.

Use TypeScript strict mode.

Keep modules small and easy to explain.

Use Zod for runtime validation where helpful.

Use upserts for ingestion jobs so repeated runs are safe.

Record module run history in Postgres.

Do not commit secrets.

Use .env.example for required environment variables.

## First milestone goal

Create a working skeleton that can:
1. start Postgres with Docker Compose
2. run Prisma migrations
3. run a CLI command
4. start a Next.js web app
5. share code through local workspace packages