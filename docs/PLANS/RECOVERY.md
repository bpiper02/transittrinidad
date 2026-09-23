# Recovery plan and implementation gate

Recovery baseline: main a9790cb. Recovery documentation branch: recovery/2026-09-23-reconstitution.

## Recovery conclusion
READY WITH SPECIFIC BLOCKERS.

Meaning: there is enough evidence to begin one bounded V2 foundation sprint. There is not enough evidence to ship a new public-beta routing runtime, nor to continue feature-building on V1.

Public/broad rider deployment remains blocked by:
- unresolved PTSC semantic migration/grouping;
- unverified critical transfer/interchange relationships;
- zero canonical route geometry;
- incomplete schedule/operating coverage;
- incomplete informal boarding/alighting policy;
- unresolved deployment gate/rollback;
- missing real-render mobile/map QA.

None of those blockers prevent building the canonical V2 model and a non-destructive migration auditor.

## Salvage decision
Do not rewrite everything.
Preserve evidence, sources, data records as migration inputs, field-review workflow ideas, useful pure utilities, and proven regression tests.
Do rebuild domain identity, graph construction, search, journey assembly, and the frontend/planner boundary.

## Bounded roadmap

### Sprint 1 — Canonical domain + non-destructive migration audit
Objective: create the V2 entity/schema layer and deterministic legacy-to-V2 migration report without changing rider runtime.
Reason: every downstream bug class depends on identity/claim boundaries.
Scope:
- V2 schemas/types for Place, AccessPoint, Corridor, Service, Direction, Pattern, Segment, TransferLink, FareRule, OperatingRule/Schedule, Source/EvidenceClaim, confidence/freshness.
- immutable NetworkSnapshot representation;
- deterministic migrator reading current canonical JSON as legacy input;
- explicit collision/ambiguity report, especially PTSC duplicates;
- no silent merges;
- data validation and fixture tests;
- generated migration summary checked into test artifacts or reproducible command.
Non-scope: new router, UI, map redesign, PTSC manual cleanup, geometry collection, public data replacement.
Dependencies: docs/DOMAIN.md, docs/DATA.md, current canonical files.
Invariants: no legacy data deletion; no semantic collision silently resolved; source record identity preserved; missing ≠ negative; snapshot immutable.
Acceptance:
1. every legacy entity is accounted for as migrated, held, or unresolved;
2. all 102 PTSC records appear in migration provenance even where fewer canonical patterns are proposed;
3. ambiguous endpoint-pair duplicates are reported, not first-match collapsed;
4. 88 stored transfers are represented as candidate/explicit TransferLinks with confidence and review state, never proximity-generated;
5. fare and schedule legacy fields map to claims/rules without selecting a winner silently;
6. migration is deterministic byte-for-byte or semantically stable;
7. existing V1 runtime remains untouched.
Tests: schema unit tests, referential integrity, collision fixtures, no-mutation, repeatability, representative PTSC duplicate fixture, fare dual-source fixture, transfer confidence fixture.
QA: independent review of entity boundaries and migration report; reviewer samples each mode and at least five known PTSC duplicate groups.
Rollback: branch contains new V2/domain/migration files only; deleting the branch restores baseline.
Definition of VERIFIED: all acceptance tests + independent reviewer + migration report with zero unaccounted legacy records and zero silent conflict resolution.

This is the exact next implementation sprint.

### Sprint 2 — Immutable topology graph + explicit transfer legality
Objective: build V2 graph from Patterns/TransferLinks and prove no invented connectivity.
Non-scope: schedules/fare ranking/UI.
Acceptance highlights: pure builder; no proximity bridges; no synthetic reverse; correct continuous same-pattern traversal; max-boardings state foundation; connectivity golden fixtures.

### Sprint 3 — Time-aware search + journey assembly
Objective: multi-label search using actual boarding time, service day, transfer count, active pattern; assemble Segments into rider Legs.
Non-scope: major frontend redesign.
Acceptance: midnight/service-day fixtures, max-transfer enforcement, multiple valid alternatives, no premature static pruning, deterministic trace reasons.

### Sprint 4 — Fare/schedule rule migration + verified golden journeys
Objective: attach Fare Rules/Operating Rules to assembled Legs and establish authoritative regression journeys.
Acceptance: Water Taxi direct/reverse schedule/fare goldens, normalized PTSC direct goldens, no graph-edge overcharge, missing/stale schedule states explicit.

### Sprint 5 — Planner API + frontend/map migration
Objective: make UI consume PlanResult rather than legacy services/routing internals; add confidence-bearing bounded geometry.
Acceptance: all core rider flows, terminal/landmark search, current location, no stale state, 360/390/430 real-render QA, maxi band colors preserved.

### Sprint 6 — V2 evidence promotion + beta operations gate
Objective: update field/association/PTSC promotion to claim-level V2 semantics; establish protected deployment, observability, rollback, field pilot.
Acceptance: builder/reviewer workflow, no downgrade, current-source freshness, deploy gate, privacy-safe traces, field-pilot metrics.

Data collection is a parallel evidence track, not a license to expand sprint scope.

## Execution protocol for every sprint
1. Technical lead issues a sprint contract from these docs.
2. One strong coding model owns implementation end-to-end.
3. Automated layer runs unit/integration/data/behavioral gates.
4. Independent strong reviewer receives diff + spec + artifacts and attempts falsification.
5. Technical lead adjudicates findings and product owner only resolves true product/domain ambiguity.
6. Merge only after “verified” definition is met.
7. No agent self-certifies its own sprint.

## First implementation gate
AUTHORIZED: Sprint 1 only.
NOT AUTHORIZED: feature sprint, visual redesign merge, V1 routing patch spree, automatic data deduplication, or wholesale merge of wb2/a9090e4c5607.
