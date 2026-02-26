# MEMORY.md

Project execution memory for Project Fibula.

## Current Snapshot
- Date initialized: 2026-02-26
- Status: Phase 9 UI polish in progress
- Owner: Faryz

## Phase Status
| Phase | Scope | Status | Branch | Last Updated | Notes |
|---|---|---|---|---|---|
| Phase 0 | Monorepo scaffold, tooling, env baseline, test setup | Completed | codex/feat/phase-0-scaffold | 2026-02-26 | Scaffold committed and pushed to GitHub; frontend/backend tests passing |
| Phase 1 | Auth (Supabase Google OAuth), protected routes, user profile basics | Completed | codex/feat/phase-1-auth | 2026-02-26 | Merged to `main` via PR #2 |
| Phase 2 | Landing page shell + workflow CRUD | Completed | codex/feat/phase-2-landing-workflow-crud | 2026-02-26 | Merged to `main` via PR #5 |
| Phase 3 | Workflow canvas foundation (React Flow interactions) | Completed | codex/feat/phase-3-canvas-foundation | 2026-02-26 | Merged to `main` via PR #7 |
| Phase 4 | Core nodes: Manual Upload, IF, SWITCH (+fallback), Set Value | Completed | codex/feat/phase-4-core-nodes | 2026-02-26 | Merged to `main` via PR #8 |
| Phase 5 | Config/service nodes: Splitting, Categorisation, Document Folder, Extractor | Completed | codex/feat/phase-5-config-service-nodes | 2026-02-26 | Merged to `main` via PR #9 |
| Phase 6 | Data Mapper + Reconciliation | Completed | codex/feat/phase-6-data-mapper-reconciliation | 2026-02-26 | Merged to `main` via PR #10 |
| Phase 7 | Webhook + HTTP nodes | Completed | codex/feat/phase-7-webhook-http-nodes | 2026-02-26 | Merged to `main` via PR #12 |
| Phase 8 | Hardening: tests, error handling, deployment readiness | Completed | codex/feat/phase-8-hardening | 2026-02-26 | Merged to `main` via PR #13 |
| Phase 9 | UI polish: design system, shell consistency, canvas and tab visual refinement | In Progress | codex/feat/phase-9-ui-polish | 2026-02-26 | Requirements-guided UX polish for login, landing tabs, settings, and workflow canvas |

## Environment Variables (Track Additions)
| Variable | Service | Required | Added In Phase | Documented in `.env.example` |
|---|---|---|---|---|
| SUPABASE_JWT_SECRET | Backend | Yes | Phase 8 | Yes |

## Key Decisions Log
| Date | Decision | Why | Impact |
|---|---|---|---|
| 2026-02-26 | Use plain JavaScript only | Match team constraint | No TypeScript setup |
| 2026-02-26 | Supabase Auth with Google OAuth only | Product requirement | Simplifies auth providers |
| 2026-02-26 | In-process workflow execution for MVP | Faster delivery | Queueing deferred post-MVP |
| 2026-02-26 | Initialize auth as loading and subscribe to `onAuthStateChange` | Avoid OAuth callback race where UI stayed on `/login` before session hydration completed | Reliable redirect to `/app` after Google sign-in |

## Open Questions
- Is the marketing page part of MVP or post-MVP?
- Which landing tabs must be fully functional in MVP vs placeholders?
- Should extractor training feedback generation run synchronously or deferred in MVP?

## Blockers
- None

## UI Polish Plan (Phase 9)
1. Build shared visual language in `frontend/src/index.css` (tokens, typography, layout shells, panel/controls).
2. Restyle journey-critical pages (`/login`, `/app`, `/app/settings`) while preserving existing behavior/tests.
3. Replace the landing layout with a topbar + sidebar navigation shell to feel enterprise-friendly.
4. Introduce Ops dashboard as the `/app` entry point with service-first configuration flow.
5. Split services into list-only dashboards and dedicated setup pages (Extractor first, then Data Mapper/Reconciliation).
6. Refine workflow canvas shell and node card styling to feel productized while preserving existing interactions.
7. Run full frontend tests and verify production build before PR.

## Guided UI Plan (Phase 11)
1. Add Ops dashboard as `/app` default and separate Workflow list at `/app/workflows`.
2. Split services into list-only dashboards and dedicated setup pages.
3. Add guided setup flows for Extractor, Data Mapper, and Reconciliation.
4. Connect workflow canvas nodes to service instances with deep links back to setup.

## Change Log
| Date | Change | By | Related Phase |
|---|---|---|---|
| 2026-02-26 | Created `AGENTS.md` and `MEMORY.md` | Codex | Setup |
| 2026-02-26 | Added monorepo app scaffolds, basic tests, and root `.gitignore` | Codex | Phase 0 |
| 2026-02-26 | Installed frontend/backend dependencies and verified both unit test suites pass | Codex | Phase 0 |
| 2026-02-26 | Initialized local git repo, created `codex/feat/phase-0-scaffold`, committed baseline, and pushed to origin | Codex | Phase 0 |
| 2026-02-26 | Added backend auth middleware and protected `/api/auth/me`, plus frontend Supabase auth foundation | Codex | Phase 1 |
| 2026-02-26 | Added user profile API (`/api/users/me`) and frontend route-based auth shell with protected pages | Codex | Phase 1 |
| 2026-02-26 | Added `/api/workflows` CRUD, landing tab shell, workflow list actions, and workflow canvas placeholder route | Codex | Phase 2 |
| 2026-02-26 | Replaced canvas placeholder with React Flow foundation and added canvas utility unit tests | Codex | Phase 3 |
| 2026-02-26 | Added core node execution service tests and core node config/preview behavior in canvas node menu | Codex | Phase 4 |
| 2026-02-26 | Added config/service node APIs and connected landing tabs for splitting/categorisation/folders/extractors | Codex | Phase 5 |
| 2026-02-26 | Added data mapper/reconciliation APIs and connected landing tabs for data map set/rule and matching set operations | Codex | Phase 6 |
| 2026-02-26 | Switched local dev defaults to frontend `5174` and backend `4000` to run alongside existing Fibula project | Codex | Ops |
| 2026-02-26 | Added webhook trigger route and HTTP/webhook node execution support with canvas config menus | Codex | Phase 7 |
| 2026-02-26 | Added readiness checks, API JSON error handling, and stricter webhook execution mode validation | Codex | Phase 8 |
| 2026-02-26 | Phase 8 hardening branch merged to `main` | Codex | Phase 8 |
| 2026-02-26 | Fixed OAuth redirect/session sync by adding explicit `redirectTo=/app` and auth state listener | Codex | Fix |
| 2026-02-26 | Fixed login-page stall by keeping login route in loading state until auth hydration completes | Codex | Fix |
| 2026-02-26 | Rebuilt UI shell with topbar + sidebar navigation, card grids, and refined canvas styling | Codex | Phase 9 |
| 2026-02-26 | Added Ops dashboard default, service list pages, and guided extractor/data mapper/reconciliation setup flows | Codex | Phase 9 |
| 2026-02-26 | Added canvas-to-service deep links and service instance selectors in node menus | Codex | Phase 11 |

## Update Rule
After each completed feature/phase PR:
1. Update Phase Status row (status, branch, date, notes)
2. Append new decision(s) if architecture/product behavior changed
3. Add newly introduced env vars
4. Record blockers and resolution notes
