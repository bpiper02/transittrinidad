# Testing, QA, and release quality

## What current tests genuinely protect
Useful current protections include:
- referential/schema validity for many legacy records;
- explicit one-way routing in declared stop order;
- no automatically synthesized reverse pattern in selected fixtures;
- same-service multi-segment rides not counted as transfers in some core tests;
- route geometry clipping regressions;
- fare monotonicity regression added at a9790cb;
- place normalization/search helpers;
- schedule date/time formatting utilities;
- repository mirror equality for selected data/core files;
- field-review payload validation and promotion workflow;
- basic browser planner interactions, swap, mode-tab replanning, no horizontal mobile overflow in one viewport, and some rider copy;
- CI runs Node suite and Chromium browser suite.

These are assets. They are not sufficient release evidence.

## Tests that encode wrong or obsolete semantics
- routing-core tests explicitly require “medium bridge fallback” to connect nearby disconnected corridor fragments. This conflicts with the recovered invariant forbidding proximity-only internal transfers.
- browser tests require the direct local fallback to appear as a route taxi. V2 must represent any generic last-mile option separately from canonical transit truth.
- UI contract tests inspect regex/source strings and exact CSS shapes; passing them does not prove rendered behavior.
- service/corridor counts and legacy ID expectations can preserve conflated identity.

These tests must be removed or rewritten when V2 semantics land; do not blindly port them.

## Integration gaps hidden by mocks
tests/browser/rider-flow.spec.mjs replaces MapLibre with a stub and stubs OSRM to a trivial line. It therefore does not prove:
- real MapLibre layer/style behavior;
- actual road-router shape;
- real tiles or style switching;
- fitBounds/interaction;
- third-party timeout/error states;
- actual visual hierarchy.

Keep deterministic mocked browser tests for speed, but add a separate real-render QA class.

## Missing critical behaviors
Current V1 lacks authoritative tests for:
- planner purity/no canonical mutation;
- max-transfer enforcement during search;
- time-dependent path choice and transfer boarding time;
- service-day rollover;
- multiple non-dominated alternatives before post-processing;
- Fare Rule application per assembled Leg;
- no transfer without explicit Transfer Link;
- semantic uniqueness of Service/Direction/Pattern;
- duplicate PTSC source-record normalization;
- uncertainty propagation to planner results;
- route geometry confidence and bounded slicing from canonical shapes;
- stale/dated ferry schedule handling;
- missing-data vs no-service user copy;
- accessibility/physical transfer constraints;
- production map integration and visual regression;
- deploy gate / branch protection / rollback.

## V2 test matrix

### 1. Domain/unit
Every entity schema and invariant. Pure utilities for time, fare, geometry, search normalization.

### 2. Property/invariant
- planning does not mutate snapshot;
- reverse never appears without a declared Pattern;
- no internal Transfer Leg without canonical TransferLink ID;
- transfer count never exceeds request limit;
- contiguous same-ride Segments assemble to one Leg;
- fare quote provenance always exists for non-unknown fare;
- partial-fare upper bound obeys known full-route rule where applicable;
- estimated data never upgrades its own confidence;
- geometry cannot define service identity.

### 3. Data validation
- unique stable IDs;
- no dangling references;
- no unexplained semantic collisions;
- source/claim provenance;
- schedule overlap/validity;
- Fare Rule coverage/conflict checks;
- transfer physical-review status;
- confidence/freshness completeness;
- migration report has zero silently resolved conflicts.

### 4. Integration
Raw evidence -> normalizer -> snapshot -> graph -> search -> journey assembly -> fare/schedule/geometry -> API result.

### 5. Golden journeys
Fixtures assert transport truth and uncertainty, not internal IDs only.

Initial VERIFIED / high-confidence candidates:
- Water Taxi Port of Spain -> San Fernando: direct marine Leg, weekday schedule-sensitive, official TT$15 one-way fare.
- Water Taxi San Fernando -> Port of Spain: reverse direct marine Leg with its own directional sailing times.
- PTSC Arima -> La Horquetta: direct official route existence/fare/times from current PTSC source, after source row is normalized into V2 identity.
- PTSC Arima -> Aripo: direct official route existence/fare/times, after normalization.

EVIDENCE-PENDING golden scenarios that must exist before public beta:
- one-transfer journey across two verified land services;
- PTSC-to-marine multi-mode journey through a physically verified Port of Spain interchange;
- a verified maxi + route-taxi journey;
- exact reverse journey for an informal corridor where both directions have evidence.

Negative/uncertainty fixtures:
- ambiguous place: same/similar locality input returns disambiguation, not silent selection;
- unreachable in current verified snapshot: return data-gap/no-verified-route, not “no service exists”;
- incomplete geometry: route can be topologically valid but map marks display geometry estimated/unavailable;
- schedule closed: Water Taxi weekend/no-sailing period must not be routed as if operating;
- mobile planner: same direct journey remains operable at 360, 390, and 430 widths.

### 6. Browser deterministic
Mock external services, but use real MapLibre code where feasible in headless browser. Verify keyboard/accessibility, state transitions, error recovery.

### 7. Real-render visual QA
At least desktop + 360/390/430 mobile screenshots with real MapLibre style and production geometry adapter. Human reviewer compares planner, map, route colors, no trailing geometry, control placement, density, and evidence disclosure.

### 8. External contract smoke
Non-blocking or quarantined checks for PTSC/NIDCO/TTIT source ingest shapes and geocoder/router availability. Never make unit CI depend on public service uptime.

## Release gates
A sprint is VERIFIED only when:
1. builder acceptance criteria pass;
2. deterministic tests pass;
3. independent reviewer reports no open P0/P1 and all P2 are dispositioned;
4. data migration/QA report is attached where data changed;
5. rendered QA is attached for UI/map changes;
6. no snapshot mutation or silent assumption;
7. documentation/decision ledger updated;
8. rollback is known.

Public beta additionally requires field-truth gates from docs/PRODUCT.md and deployment protection/rollback.

## Builder/reviewer separation
The coding model owns one bounded sprint. Reviewer receives the spec, diff, tests, generated reports, and screenshots but not the builder’s rationale as truth. Reviewer actively tries to falsify correctness and may demand new fixtures.
