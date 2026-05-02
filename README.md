# GitHub Inventory

GitHub Inventory is a single-repo application for tracking repositories owned by a GitHub user or organization and storing that inventory in Postgres.

## Architecture

- `apps/web`: Vite + React + TypeScript SPA
- `apps/api`: FastAPI service and HTTP route wiring
- `apps/cli`: Typer operator CLI for manual and scheduled jobs
- `packages/inventory-core`: shared SQLAlchemy models, Alembic migrations, schemas, services, and GitHub sync client
- `postgres`: primary datastore
- `pgadmin`: Postgres administration UI
- host `cron`: schedule authority for running sync commands

The web app does not connect to Postgres directly. It calls the FastAPI service over HTTP. The API and CLI are separate Python packages, and both depend on `github-inventory-core` for shared data models and business logic.

## Repository Layout

```text
/
  apps/
    api/
    cli/
    web/
  packages/
    inventory-core/
  infra/docker/
  docker-compose.yml
  .env.example
```

## Getting Started

1. Create a local `.env` from `.env.example`.
2. Start the runtime stack:

   ```bash
   docker compose up --build
   ```

3. Open the applications:
   - Web UI: `http://localhost:5173`
   - API docs: `http://localhost:8000/docs`
   - pgAdmin: `http://localhost:5050`

## Compose Services

- `postgres`: database with persistent volume
- `pgadmin`: preconfigured to connect to the local `postgres` service
- `migrate`: installs `packages/inventory-core` and runs `alembic upgrade head`
- `api`: installs `packages/inventory-core` plus `apps/api`, then serves FastAPI with `uvicorn`
- `web`: Vite development server
- `cli`: installs `packages/inventory-core` plus `apps/cli`; on-demand only, used manually and by cron

## API Endpoints

- `GET /health`
- `GET /api/owners`
- `POST /api/owners`
- `GET /api/repositories`
- `GET /api/repositories/{id}`
- `GET /api/sync-runs`
- `POST /api/owners/{id}/sync`

## CLI Commands

Run the CLI service on demand:

```bash
docker compose --profile cli run --rm cli owners add --login openai --type org
docker compose --profile cli run --rm cli owners list
docker compose --profile cli run --rm cli sync owner 1
docker compose --profile cli run --rm cli sync all
docker compose --profile cli run --rm cli repos list --owner 1
docker compose --profile cli run --rm cli sync-runs list --owner 1
```

## Cron

The schedule lives in host-level cron, not in application code.

Example hourly full sync:

```cron
0 * * * * cd /absolute/path/to/github-inventory && docker compose --profile cli run --rm cli sync all >> /var/log/github-inventory-sync.log 2>&1
```

Example per-owner sync:

```cron
15 * * * * cd /absolute/path/to/github-inventory && docker compose --profile cli run --rm cli sync owner 1 >> /var/log/github-inventory-owner-1.log 2>&1
```

## Environment

Key variables:

- `DATABASE_URL`: SQLAlchemy connection string used by the API, CLI, and migrations
- `GITHUB_TOKEN`: GitHub PAT used for sync operations
- `CORS_ORIGINS`: comma-separated origins allowed to call the API
- `VITE_API_BASE_URL`: browser-facing API base URL for the web app
- `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD`: pgAdmin login

## Testing

Core Python tests are under `packages/inventory-core/tests`.
API tests are under `apps/api/tests`.
CLI tests are under `apps/cli/tests`.
Web tests are under `apps/web/src`.

```bash
uv run --package github-inventory-core --extra dev pytest packages/inventory-core/tests
uv run --package github-inventory-api --extra dev pytest apps/api/tests
uv run --package github-inventory-cli --extra dev pytest apps/cli/tests
cd apps/web && npm test
```
