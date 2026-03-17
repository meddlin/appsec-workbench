# GitHub Inventory

A better way to manage your GitHub.

## Tech Stack

- Python CLI
- Postgres

## Useful Tools for this repo

- Draw.io Integration (VSCode extension)
- Draw.io Integration: Mermaid plugin (VSCode extension)
- Draw.io Integration: Markdown plug (VSCode extension)
- SQLite client/browser


## Goal

Create a GitHub inventory system

### Features & Requirements

General

- All data lives within Postgres
- Next.js application to query a display data from Postgres
    - TypeScript basis
    - cron jobs that pull data into Postgres
- A CLI option for automation purposes

Architecture

- single repo
- container-based deployment(s)