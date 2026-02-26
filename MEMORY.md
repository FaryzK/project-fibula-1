# MEMORY.md

Project execution memory for Project Fibula.

## Current Snapshot
- Date initialized: 2026-02-26
- Status: Phase 3 workflow canvas foundation in progress
- Owner: Faryz

## Phase Status
| Phase | Scope | Status | Branch | Last Updated | Notes |
|---|---|---|---|---|---|
| Phase 0 | Monorepo scaffold, tooling, env baseline, test setup | Completed | codex/feat/phase-0-scaffold | 2026-02-26 | Scaffold committed and pushed to GitHub; frontend/backend tests passing |
| Phase 1 | Auth (Supabase Google OAuth), protected routes, user profile basics | Completed | codex/feat/phase-1-auth | 2026-02-26 | Merged to `main` via PR #2 |
| Phase 2 | Landing page shell + workflow CRUD | Completed | codex/feat/phase-2-landing-workflow-crud | 2026-02-26 | Merged to `main` via PR #5 |
| Phase 3 | Workflow canvas foundation (React Flow interactions) | In Progress | codex/feat/phase-3-canvas-foundation | 2026-02-26 | Added React Flow canvas with node library, search, anti-collision placement, node linking, quick branch add, node rename, and recenter |
| Phase 4 | Core nodes: Manual Upload, IF, SWITCH (+fallback), Set Value | Not Started | - | 2026-02-26 | |
| Phase 5 | Config/service nodes: Splitting, Categorisation, Document Folder, Extractor | Not Started | - | 2026-02-26 | |
| Phase 6 | Data Mapper + Reconciliation | Not Started | - | 2026-02-26 | |
| Phase 7 | Webhook + HTTP nodes | Not Started | - | 2026-02-26 | |
| Phase 8 | Hardening: tests, error handling, deployment readiness | Not Started | - | 2026-02-26 | |

## Environment Variables (Track Additions)
| Variable | Service | Required | Added In Phase | Documented in `.env.example` |
|---|---|---|---|---|
| - | - | - | - | - |

## Key Decisions Log
| Date | Decision | Why | Impact |
|---|---|---|---|
| 2026-02-26 | Use plain JavaScript only | Match team constraint | No TypeScript setup |
| 2026-02-26 | Supabase Auth with Google OAuth only | Product requirement | Simplifies auth providers |
| 2026-02-26 | In-process workflow execution for MVP | Faster delivery | Queueing deferred post-MVP |

## Open Questions
- Is the marketing page part of MVP or post-MVP?
- Which landing tabs must be fully functional in MVP vs placeholders?
- Should extractor training feedback generation run synchronously or deferred in MVP?

## Blockers
- None

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

## Update Rule
After each completed feature/phase PR:
1. Update Phase Status row (status, branch, date, notes)
2. Append new decision(s) if architecture/product behavior changed
3. Add newly introduced env vars
4. Record blockers and resolution notes
