# ADR 0001 — Recovery and V2 boundaries

Date: 2026-09-23
Status: ACCEPTED

## Context
V1 accumulated many correct local fixes but the recovery audit confirmed that several repeated failures share structural causes: legacy transit identity conflation, incomplete routing state, proximity-created connectors, mutable query state, post-hoc schedule ranking, graph-step fare boundaries, and absent canonical geometry.

At the same time, the repository contains valuable source/evidence work, clean referential data, field-review workflows, fare/schedule utilities, regression tests, and curated local knowledge.

## Decision
Use a partial runtime rebuild.

Preserve:
- raw/current evidence and provenance;
- useful Access Point/Place records as migration inputs;
- fare/schedule source records;
- field/association review approach;
- tested pure helpers whose semantics remain valid.

Rebuild:
- Service/Direction/Pattern/Trip identity;
- graph construction;
- time-aware search state;
- journey assembly;
- transfer legality;
- fare/schedule application boundaries;
- planner API.

Forbidden in V2:
- proximity-only internal transfers;
- synthetic reverse service;
- generic local taxi fallback represented as canonical route taxi;
- geometry as service identity;
- mutation of canonical snapshot during search;
- silent semantic deduplication;
- tests that outrank product/domain truth.

## Consequences
V1 remains a reference and migration input, not the future architecture.
The first implementation sprint is domain/migration only.
Public beta waits for transfer, schedule, geometry, field, deployment, and rendered-QA gates.
