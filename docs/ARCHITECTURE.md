# Architecture recovery and V2 target

## Current implementation map at main a9790cb

| Subsystem | State | Evidence / reason |
|---|---|---|
| Static frontend shell | YELLOW | public/index.html + public/app-v2.js provide real planner interactions, but one large browser module mixes search, map, routing presentation, external calls, and product policy. |
| Search/autocomplete | YELLOW | src/place-core.mjs cleanly handles local places; external geocoders are bounded to TT. Local autocomplete does not model curated landmarks and formal network points are not first-class suggestion data. |
| Domain schemas | RED/YELLOW | src/data-contract.mjs has useful syntactic/reference validation but validates the legacy conflated service model. |
| Canonical JSON data | YELLOW | provenance-rich and referentially clean; semantics and precision vary. |
| Graph construction | RED | src/routing-core.mjs builds directly from legacy service rows and can add query-created proximity bridges. |
| Route search | RED | state key is node + lastServiceId + required-mode flag; time, boardings/transfer count and semantic pattern identity are absent. |
| Journey alternatives | RED | one static shortest path is selected per variant before timetable/evidence ranking; valid alternatives can be pruned early. |
| Schedule utilities | YELLOW | timezone/date helpers are useful, but route eligibility is filtered by trip-start date rather than actual boarding service-day. |
| Fare utilities | YELLOW | source-aware ranges and monotonicity fix are valuable; fareForJourney can still price raw graph transit steps rather than assembled rider legs. |
| Geometry utilities | YELLOW | clipping/projection math is reusable; there are zero canonical verified service shapes. |
| Map rendering | YELLOW/UNKNOWN | MapLibre integration exists; branch wb2/a9090e4c5607 improves mode/style state but is not merged or fully human-verified. |
| Field/association tooling | GREEN/YELLOW | evidence-first export/promotion separation is a strong pattern; matching/promotion still targets legacy service semantics. |
| PTSC ingest/promotion | YELLOW/RED | official evidence capture is valuable; promotion creates duplicate service identities and blocks some timetable replacement. |
| QA/data validation | YELLOW | many useful deterministic checks, but some metrics mirror legacy fields and inflate repeated manifestations. |
| Unit/integration tests | YELLOW | broad coverage, but some tests encode rejected behavior and many are implementation-shaped. |
| Browser tests | YELLOW | useful interaction checks; map/OSRM are stubbed, so they do not prove production rendering/integration. |
| CI | YELLOW | Node and Chromium workflows exist and latest baseline Actions passed; no branch rulesets were present at recovery. |
| Deployment | UNKNOWN/YELLOW | historical audit found ungated Pages behavior; current repository has no deployment workflow in .github/workflows. Deployment configuration requires explicit re-verification before release. |
| Observability | RED | no production telemetry/error/route-decision trace layer sufficient for beta diagnosis. |

## Salvage decisions

KEEP:
- raw source/evidence files and citations;
- curated place aliases/centroids as seed data;
- physically meaningful node records, subject to confidence migration;
- field-review concept and evidence-before-promotion workflow;
- pure utility math where tests prove semantics: place normalization, geometry clipping/projection, portions of schedule/fare formatting;
- CI concept and repo-integrity goal.

MIGRATE/REFACTOR:
- fares into Fare Rules with one authoritative storage path;
- schedules into operating calendars / exact trips / frequency windows / unknown state;
- nodes into Access Points with physical-facility relationships;
- transfers into explicit Transfer Links after audit;
- PTSC official records into source records mapped to Service/Direction/Pattern/Trip;
- source/confidence metadata into claim-scoped evidence.

REBUILD:
- canonical service identity layer;
- graph builder;
- search state and algorithm;
- journey assembly;
- transfer/interchange logic;
- schedule-aware routing;
- fare evaluation boundary;
- route alternative generation;
- planner API boundary;
- frontend adapter from planner result to UI.

REMOVE:
- automatic proximity corridor bridges as routing truth;
- direct unsurveyed local fallback represented as route_taxi Service;
- prose-regex inference as an architectural source of boarding policy/geometry semantics;
- legacy tests that require those behaviors.

NEEDS MORE EVIDENCE:
- whether branch wb2/a9090e4c5607 visual redesign should be cherry-picked;
- final hosting/deployment mechanism;
- physical validity/accessibility of every one of 88 current transfer links;
- exact semantic grouping of PTSC duplicate official records.

## V2 dependency direction
Raw Evidence -> Normalization -> Canonical Domain Snapshot -> Graph Builder -> Time-aware Search -> Journey Assembly -> Fare/Schedule/Geometry Enrichment -> Planner API -> Frontend/Map.

Admin tooling writes Raw Evidence / Proposed Claims. It does not write graph edges or frontend-ready routes directly.

Frontend never reads raw service JSON to infer semantics. It consumes Planner API/domain view models.

Graph builder never calls geocoders, map renderers, UI code, or external web APIs.

Search never mutates Canonical Domain Snapshot.

Fare engine never depends on rendered graph-edge count.

Schedule engine never depends on UI-selected labels; it receives timestamps and canonical operating rules.

Geometry renderer never determines route identity.

## Canonical data layer
Use versioned JSON initially; a database is not required to fix semantics. Separate:
- raw/source snapshots;
- normalized claims;
- canonical entities;
- generated network snapshot;
- audit reports.
Schema validation must be machine-enforced.

## Graph construction
Build an immutable graph from Patterns:
- pattern-position nodes or equivalent state preserve ordered traversal;
- transit Segment edges reference pattern identity;
- Transfer Links are only explicit canonical links;
- no same-town or proximity-generated internal transfer;
- origin/destination access is query-local and separate from network transfer;
- virtual corridor access is query-local and only permitted by structured access policy.

## Routing state
Minimum state must include:
- graph position;
- active pattern/ride context;
- boarding count or transfer count;
- actual arrival/clock time / operating-day context for schedule-aware search;
- required/preferred mode state where applicable.
Use label-setting / Dijkstra-style dominance with multiple labels, not one scalar best-per-node that erases a later-valid alternative.

## Journey assembly
Collapse contiguous Segments on the same ride context into one Leg. Insert explicit walking Transfer Legs. Only assembled Legs are exposed to fare/instruction/UI systems.

## Schedule evaluation
Evaluate at actual boarding timestamp in America/Port_of_Spain. Exact departures, service calendars, date exceptions, and frequency/unknown states are distinct. A route may be topologically reachable but temporally unavailable.

## Fare evaluation
Fare Rules apply to a Leg or ticket/journey rule. Exact official fare wins when applicable; derived range must carry derivation and confidence. Unknown remains unknown.

## Geometry/display
Pattern geometry is confidence-bearing evidence. Bounded ridden geometry is sliced from the Pattern. Road-router fallback, if used, must be an explicitly estimated display shape and cannot justify boarding, direction, or service identity.

## API
Introduce a planner boundary even if implemented in-process initially:
PlanRequest: origin, destination, departure time, preference/constraints.
PlanResult: resolved endpoints, alternatives, structured Legs, warnings/data gaps, evidence summaries, route-decision trace ID.
This allows frontend replacement without coupling to routing internals.

## Admin/editing
Retain review/export/promotion separation, but promotions create/modify domain claims/entities through validation. No browser admin action directly edits canonical snapshot.

## Observability
For beta, record privacy-safe planner decision traces: snapshot version, resolved endpoints, rejected-candidate reason counts, chosen patterns, uncertainty flags, errors, and performance. Do not log precise user location beyond what is operationally necessary.

## Mechanical enforcement
- immutable/frozen snapshot API in tests;
- schema discriminated unions for entity types;
- no imported frontend modules from domain/routing packages;
- dependency lint/check;
- tests that hash canonical input before/after planning;
- transfer builder accepts only explicit TransferLink records;
- migration report fails on unresolved semantic collisions unless explicitly held.
