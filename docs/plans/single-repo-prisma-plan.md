# Single Repo With Prisma-Owned DB Contract

## Summary
- Keep one Git repo with `two isolated apps`: a `Next.js` web app and a `Python` CLI/worker.
- Make `Prisma` the single owner of the database contract under `db/prisma/`.
- Keep deployment separate: one image for `web`, one image for `cli/worker`, and one migration step that runs Prisma migrations before app rollout.
- Avoid dual schema ownership: the web app owns schema/migrations through Prisma; the Python app consumes the resulting Postgres schema with typed SQL access, not its own migration system.

## Repository Layout

```text
/
  apps/
    web/
      package.json
      tsconfig.json
      src/
    cli/
      pyproject.toml
      uv.lock
      src/
      tests/
  db/
    prisma/
      schema.prisma
      migrations/
      seed.ts            # optional
  infra/
    docker/
      web.Dockerfile
      cli.Dockerfile
  scripts/
  docs/
  Makefile
  mise.toml
  docker-compose.yml
  .env.example
```

- `db/prisma/schema.prisma` is the canonical schema definition.
- `db/prisma/migrations/` is the only migration history.
- `apps/web` references the external Prisma schema path via `package.json` or `prisma.config.ts`.
- `apps/cli` does not own migrations and does not generate its own schema.

## Implementation Changes
- Web app:
  - Use `Next.js + TypeScript + Prisma`.
  - Configure Prisma in `apps/web` to point to `../../db/prisma/schema.prisma`.
  - Use Prisma Client for all web-side DB access.
  - Keep local app auth in the web app with local accounts and server sessions; no OAuth providers.
- CLI/worker:
  - Use `Python 3.12`, `uv`, `pytest`, `ruff`, `mypy`.
  - Use `psycopg` with a repository/service layer and typed DTOs/dataclasses for DB access.
  - Keep GitHub sync logic, scheduling entrypoints, reports, and admin commands here.
  - Do not introduce Alembic or a second migration tool.
- Database contract:
  - Model repo inventory, development metadata, governance summary, sync status, and sync runs in Prisma schema.
  - Generate SQL migrations only through Prisma migration commands.
  - If Python needs hand-tuned SQL for performance, keep it in the CLI app, but it must target the Prisma-owned schema.

## Build And Deployment
- Local workflow:
  - `make web-install`, `make cli-install`
  - `make db-generate` runs Prisma generate from `apps/web`
  - `make db-migrate` runs Prisma migrations against Postgres
  - `make web-dev`, `make cli-test`, `make web-test`
- CI workflow:
  - `web-quality`: lint, typecheck, unit tests, Next build
  - `cli-quality`: lint, typecheck, unit tests
  - `db-contract`: validate Prisma schema, apply migrations to disposable Postgres, run smoke checks
- Production rollout:
  1. Run Prisma migration job against Postgres
  2. Deploy `web` image
  3. Deploy `cli/worker` image
  4. Run scheduled syncs from the `cli/worker` runtime via cron/systemd/platform scheduler
- Scheduler:
  - `core` hourly
  - `development` daily
  - `governance` weekly
  - all sync jobs call CLI commands and record status in the database

## Interfaces And Ownership
- Canonical DB contract:
  - `db/prisma/schema.prisma`
  - Prisma migration history under `db/prisma/migrations/`
- Web-facing interfaces:
  - repository list/detail APIs
  - annotation update APIs
  - admin sync-trigger API
- CLI interfaces:
  - `github sync core`
  - `github sync development`
  - `github sync governance`
  - `github sync all`
  - `github repos list`
  - `github report daily-summary`
- Ownership rules:
  - Prisma owns schema and migrations
  - Python owns sync/report operations
  - Next.js owns UI, local auth, and web APIs
  - No schema changes are made from Python code

## Test Plan
- Web unit tests:
  - table/search/filter logic
  - repo detail rendering
  - annotation form behavior
  - API handlers with mocked Prisma access
- CLI unit tests:
  - GitHub client pagination/retry/rate-limit handling
  - sync orchestration by domain
  - repository/service layer behavior
  - CLI argument parsing
- DB contract tests:
  - migration apply/rollback safety on disposable Postgres
  - Prisma schema validation
  - compatibility smoke test proving Python queries work against the migrated schema
- Cross-app integration tests:
  - sync writes repo/domain data correctly
  - web reads the synced data and updates local annotations correctly

## Assumptions And Defaults
- One repo is acceptable as long as `web`, `cli`, and `db contract` remain clearly separated.
- Prisma is the only migration/schema authority.
- Python uses explicit SQL access rather than a second ORM/migration stack.
- The CLI is an operator/runtime tool, not a separately distributed product in v1.
- The web app uses local authentication only; the GitHub PAT is server-side and used only by sync processes.
