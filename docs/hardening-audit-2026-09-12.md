# Transit Trinidad hardening audit — 2026-09-12

Baseline commit: `7e3a2950da4c8493455a4e22823ad601dcd34f1f`

This audit is intentionally behavior-preserving. Refactors must keep rider-visible routing, transfer counts, fare output, instructions and browser flows unchanged unless a separately reproduced bug justifies a behavior change.

## Runtime/source classification

| Area | Classification | Notes |
| --- | --- | --- |
| `public/index.html` | KEEP | Current rider shell. Loads `./app-v2.js`. |
| `public/app-v2.js` | KEEP / refactor target | Current browser entrypoint. Large controller with map, geocoding, routing orchestration, caching and rendering responsibilities. |
| `public/app.js` | LEGACY candidate | Older rider app. No current HTML entrypoint references it. Must remain removable only after architecture contract and browser QA pass. |
| `src/*.mjs` domain modules | CANONICAL | Node/test source of truth for routing, fares, schedules, places, instructions and review logic. |
| `public/src/*.mjs` | GENERATED-MIRROR candidate | Browser copies of selected canonical modules. Seven files currently mirror `src/`; prior CI enforced byte equality for only two. |
| `public/routing-core.mjs` | LEGACY duplicate candidate | Duplicate of canonical routing core at a path not used by current rider runtime. |
| `data/*.json` | CANONICAL | Validated source datasets. |
| `public/data/*.json` | GENERATED-MIRROR | Browser artifacts; must remain byte-identical to canonical data. |
| one-shot `tools/apply-*` migrations | HISTORICAL / review individually | Useful provenance, but should not be part of normal maintenance path after their changes are canonical. |

## First-pass risk findings

1. **Mirror drift risk.** Seven `public/src` modules mirror `src`, but the old repo-integrity test checked only two.
2. **Legacy app duplication.** `public/app.js` is a large prior rider app alongside current `app-v2.js`.
3. **Legacy routing duplicate.** `public/routing-core.mjs` duplicates `src/routing-core.mjs` while current browser code imports `public/src/routing-core.mjs`.
4. **God-controller risk.** `public/app-v2.js` is roughly 38 KB and owns UI state, map rendering, geocoding, OSRM geometry, caching, route planning and HTML rendering.
5. **Manual mirror workflow.** Browser source/data mirrors rely on people/tools remembering to update both copies. This should become deterministic generation.
6. **No static-analysis gate.** The project has strong behavior/data tests but no lint/import-quality gate yet.

## Hardening mini-sprints

### R0 — baseline freeze
- Lock current browser entrypoint and all canonical/browser mirrors.
- Preserve 30 golden journeys, C1 pilot invariants and browser tests.
- QA: full unit/data + desktop/mobile browser suite.

### R1 — inventory and dead-code proof
- Build source/runtime classification.
- Prove legacy candidates are unreferenced before deletion.
- QA: architecture contract + full existing suite.

### R2 — static analysis
- Add ESLint with bug-oriented rules first.
- Fix semantic lint failures separately from formatting/style warnings.
- QA: lint + full existing suite.

### R3 — duplicate cleanup
- Remove only proven-unused legacy files.
- Consolidate duplicate helpers/constants where behavior can be characterized.
- QA: no runtime entrypoint/import change; golden + browser suites unchanged.

### R4 — modularize rider controller
- Extract pure concerns from `app-v2.js` in small pieces: config/constants, storage/cache helpers, external-service adapters, view formatting.
- Keep routing core untouched.
- QA after every extraction with source-level contract + browser suite.

### R5 — deterministic publish pipeline
- Make `src/` and `data/` the only editable canonical sources.
- Generate `public/src/` and `public/data/` with one command.
- CI fails on dirty generated artifacts.
- QA: byte-equality + complete test/browser suites.

### R6 — deep bug bash
- Async stale-response races, malformed cache/storage, missing coordinates, invalid external API payloads, duplicated IDs, impossible route data and boundary-value tests.
- Every bug gets reproduce → regression test → fix.

### R7 — security hardening
- XSS/HTML sink audit, unsafe URL handling, local reviewer-data exposure, CSP/hosting-header feasibility, CDN/dependency pinning and workflow permissions.
- No irrelevant account/payment security theater while those systems do not exist.

### R8 — open-source readiness
- README architecture, CONTRIBUTING, SECURITY, license decision, setup/test commands, data provenance and generation rules.
- Final complete regression gate.
