# Project Fibula 1

Project Fibula 1 is the Codex-led implementation of Fibula.

## Important distinction
- `project-fibula` is an earlier implementation built with another agent.
- `project-fibula-1` is the implementation that starts coding with Codex.

Repository: [github.com/FaryzK/project-fibula-1](https://github.com/FaryzK/project-fibula-1)

## What this project is
Workflow-first ETL platform for document processing. Users build workflows on a canvas by connecting nodes. Documents flow through nodes and accumulate metadata.

## Stack
- Frontend: React + Vite + Tailwind + Zustand + React Flow (`@xyflow/react`)
- Backend: Node.js + Express (plain JavaScript, MVC)
- Database: Supabase Postgres (+ `pgvector`)
- Storage: Supabase Storage
- Auth: Supabase Auth (Google OAuth only)
- LLM/VLM: OpenAI
- Tests: Vitest (frontend), Jest (backend), unit tests only
- Deployment: Render + Supabase

## Structure
- `/frontend`
- `/backend`
- `/requirements`
- `/AGENTS.md`
- `/MEMORY.md`

## Source of truth
Feature behavior is defined in `/requirements`. Read relevant requirement docs before implementing each feature.

## Local Development Ports
- `project-fibula-1` frontend (Vite): `http://localhost:5174`
- `project-fibula-1` backend (Express): `http://localhost:4000`
- Frontend API base URL should be `VITE_API_BASE_URL=http://localhost:4000/api`

## Deployment Readiness
- Health endpoint: `GET /api/health` (liveness)
- Readiness endpoint: `GET /api/health/readiness` (config readiness)
- Required backend env vars for readiness:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
