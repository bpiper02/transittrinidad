# Sprint 01 — Canonical domain and non-destructive migration audit

Status: AUTHORIZED NEXT IMPLEMENTATION SPRINT ONLY.
Owner: one strong coding model.
Independent reviewer: required and must be a different strong model.
Runtime impact: NONE.

## Objective
Create the V2 canonical domain/schema layer and a deterministic, non-destructive migration auditor that accounts for every legacy Transit Trinidad data record without silently deciding ambiguous transport truth.

This sprint exists to make later routing work possible. It does not build a router.

## Required reading
- AGENTS.md
- docs/PRODUCT.md
- docs/FLOWS.md
- docs/DOMAIN.md
- docs/ARCHITECTURE.md
- docs/DATA.md
- docs/ASSUMPTIONS.md
- docs/BUGS.md
- docs/QUALITY.md
- docs/DECISIONS/0001-recovery-and-v2-boundaries.md

## Inputs
Read-only legacy inputs:
- data/nodes.json
- data/places.json
- data/services.json
- data/transfers.json
- data/fares.json
- data/schedules.json
- relevant evidence/source records already in repo

Do not rewrite those files in this sprint.

## Deliverables
1. A V2 domain/schema module or modules covering at minimum:
   Place, AccessPoint, Corridor, Service, Direction, Pattern, PatternPosition/Segment, TransferLink, FareRule, OperatingRule/Schedule, Source/EvidenceClaim, confidence/freshness, immutable NetworkSnapshot.
2. A deterministic legacy migration/analyzer command.
3. Machine-readable migration output and human-readable summary.
4. Explicit unresolved-collision records; no first-match/guess merge.
5. Tests and validation gates.
6. Minimal architecture/documentation updates only where implementation reveals a fact the recovery spec did not cover.

## Migration rules
- Preserve every legacy source record/provenance reference.
- A legacy service row is an input record, not automatically one V2 Service or Direction.
- Do not delete duplicate-looking PTSC rows; classify/map/hold them.
- Do not use endpoint pair alone to merge services.
- Do not synthesize reverse direction.
- Do not generate transfers from proximity.
- Do not upgrade confidence during migration.
- Do not convert missing fields into negative assertions.
- Do not choose between service.fareTTD and fares.json silently; report dual-source cases and proposed rule mapping.
- Do not interpret times_unavailable as a timetable.
- Query/runtime heuristics do not belong in the canonical snapshot.
- Do not introduce a database unless a concrete acceptance criterion cannot be met with versioned files.

## Required migration accounting
The report must account for the baseline counts from main a9790cb:
- 108 nodes
- 36 places
- 189 legacy service rows, including all 102 PTSC rows
- 88 stored transfer rows
- 85 fare rows
- 76 schedule rows

Every input row must land in exactly one accounting state:
- migrated with explicit target identity;
- retained as source/evidence pending semantic mapping;
- held/unresolved with machine-readable reason.

“Dropped”, implicit omission, and “deduped because same endpoints” are failures.

## Required collision reports
At minimum:
- PTSC records sharing endpoint direction but differing official/source identity;
- PTSC records sharing stop sequence;
- corridor IDs whose semantics appear directional/service-like;
- legacy fare field + fare-record overlap/conflict;
- schedule overlap or weaker/stronger replacement candidates;
- transfer pairs with confidence/review state;
- Access Points with approximate/missing location-confidence semantics.

The auditor may identify more collision classes.

## Acceptance criteria
1. 100% baseline-record accounting with zero silent drops.
2. All 102 PTSC rows remain traceable through provenance.
3. Ambiguous PTSC groups are unresolved/reported unless evidence deterministically establishes the mapping.
4. No canonical TransferLink is created merely because two points are near.
5. No synthetic reverse Pattern/Direction.
6. Fare/schedule conflicts are explicit, not overwritten.
7. NetworkSnapshot is immutable by API/contract and a test proves planning-style/query-local augmentation cannot mutate it.
8. Running the migration twice on identical inputs yields semantically identical output.
9. Schemas reject identity conflation examples covered by tests.
10. V1 rider runtime/data files are byte-identical before and after the sprint.
11. All new tests plus existing unaffected tests pass.
12. Independent review finds no open P0/P1 issue and all P2 findings are dispositioned.

## Required tests
- schema validation per entity type;
- dangling-reference checks;
- deterministic output/repeatability;
- snapshot immutability;
- PTSC duplicate endpoint/stop-sequence fixture;
- dual fare source fixture;
- schedule overlap/supersession fixture;
- transfer confidence/review-state fixture;
- missing-is-unknown fixture;
- no synthetic reverse fixture;
- no proximity transfer fixture;
- baseline accounting assertion using current canonical files.

Do not make tests assert proposed canonical IDs merely because the migrator generated them once. Assert semantics/invariants.

## Required QA artifacts
- summary counts: input, migrated, held, unresolved by entity/source type;
- PTSC collision table;
- fare conflict table;
- schedule conflict table;
- transfer review table;
- list of all assumptions made, each linked to CONFIRMED / CHOSEN / INFERRED / UNKNOWN status;
- git diff proving no legacy runtime/data mutation.

## Independent reviewer brief
Attempt to falsify:
- whether different source records were accidentally collapsed;
- whether same endpoint pairs were treated as same Service;
- whether confidence was upgraded;
- whether missing data became false negative data;
- whether a proximity relationship became a transfer;
- whether fare/schedule conflict was hidden;
- whether schemas still allow service/direction/pattern conflation;
- whether the migration is deterministic;
- whether any legacy input row is unaccounted.

Reviewer must sample every mode and at least five PTSC duplicate groups.

## Rollback
All work is isolated to a sprint branch. Since V1 runtime/data are untouched, rollback is branch deletion/revert. No data migration is applied to production in this sprint.

## Definition of verified
“Verified” means all acceptance criteria pass, required artifacts exist, existing unaffected CI passes, and the independent reviewer has no unresolved P0/P1 findings.

Do not begin Sprint 02 automatically.
