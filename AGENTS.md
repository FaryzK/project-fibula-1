# AGENTS.md

This file defines how coding agents should operate in this repository.

## Project Context
- Project: Project Fibula
- Goal: Workflow-first ETL platform for document processing
- Core UX: Canvas-based workflow builder with node execution over documents + metadata

## Stack
- Frontend: React + Vite + Tailwind + Zustand + React Flow (`@xyflow/react`)
- Backend: Node.js + Express (plain JavaScript, MVC)
- Database: Supabase Postgres (+ `pgvector`)
- Storage: Supabase Storage
- Auth: Supabase Auth (Google OAuth only)
- AI: OpenAI (LLM/VLM use cases)
- Tests: Vitest (frontend), Jest (backend), unit tests only
- Deploy: Render (frontend/backend) + Supabase

## Repository Structure
- `/frontend` React app
- `/backend` Express API
- `/requirements` Product and feature specifications
- `AGENTS.md` Agent execution rules
- `MEMORY.md` Phase tracker and decisions log

## Non-Negotiables
- Plain JavaScript only (no TypeScript)
- TDD workflow: write failing test first, then implementation
- Backend MVC layering: routes -> controllers -> services -> models
- No business logic in routes/controllers
- All backend API routes must be prefixed with `/api`
- Never commit secrets or `.env`
- Update `.env.example` when adding environment variables

## Requirements-First Rule
Before implementing any feature, read the relevant file(s) in `/requirements`.

Mapping:
- Platform + landing + tab scope: `Project Fibula Overview, Landing Page, Nodes.txt`
- Canvas interactions: `Workflow Canvas Page.txt`
- Trigger/IF/SWITCH/Set Value: `Trigger Node and IF & Switch Node and Set Value node.txt`
- Splitting/Categorisation config: `Document Splitting & Categorisation Config node.txt`
- Extractor node/service: `Service Node - Extractor Node.txt`
- Data mapper: `Service Node - Data Mapper Rule.txt`
- Reconciliation: `Service Node - Reconciliation.txt`
- Document folder: `Service Node - Document Folder.txt`
- Webhook: `Webhook Node.txt`
- HTTP export: `HTTP Node.txt`

## Architecture Notes
- Supabase JWT must be validated in backend auth middleware for protected routes
- Documents are stored in Supabase Storage; Postgres stores URLs and metadata references
- `pgvector` must be enabled for extractor feedback embeddings
- Workflow execution is in-process for MVP (no external queue)
- Track document path with a `document_execution` record
- SWITCH node always includes fallback output port
- Reconciliation input ports are labeled using extractor names from rule config

## Frontend Conventions
- React Flow nodes live in `frontend/src/components/nodes/`
- Zustand stores live in `frontend/src/stores/` (one store per domain)
- Axios auth client lives in `frontend/src/services/api.js`

## Development Commands
- `cd frontend && npm run dev`
- `cd backend && npm run dev`
- `cd frontend && npm test`
- `cd backend && npm test`
- `cd backend && npm run migrate`
- `cd backend && npm run migrate:rollback`

## Git Workflow
- Never commit directly to `main`
- Create one branch per feature/phase (agent branches should use prefix `codex/`)
- Use Conventional Commits:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `test: ...`
  - `docs: ...`
  - `refactor: ...`
- After a phase is merged/pushed, update phase status in `MEMORY.md`

## Execution Checklist (for agents)
1. Read relevant requirement file(s)
2. Add or update failing tests first
3. Implement minimal code to satisfy tests
4. Run tests for changed scope
5. Update `MEMORY.md` (phase status, key decisions, blockers)
6. Summarize changes with file references and test results
