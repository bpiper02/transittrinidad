# Recovery evidence index

Checked 2026-09-23 unless otherwise stated.

## Repository evidence
Baseline commit: a9790cb87055c9d9aa548e0119de6ac8fd80d837.

Primary code:
- src/routing-core.mjs — graph construction, route search, virtual access, proximity bridges, alternative generation.
- src/journey-time-core.mjs — wait/elapsed-time evaluation.
- src/schedule-core.mjs — calendar/date helpers.
- src/fare-core.mjs — fare lookup/interpolation and September 17 monotonicity fix.
- src/journey-geometry-core.mjs — clipping/projection.
- src/place-core.mjs — local Place search and explicit network-node resolution.
- src/data-contract.mjs — legacy schema/reference validation.
- src/network-qa-core.mjs — raw data-quality finding generation.
- src/field-review-core.mjs, association-import-core.mjs, association-promotion-core.mjs — contributor evidence workflow.
- src/ptsc-import-core.mjs, ptsc-promotion-core.mjs — official-source ingestion/promotion.

Primary data:
- data/nodes.json
- data/places.json
- data/services.json
- data/transfers.json
- data/fares.json
- data/schedules.json
- data/golden-journeys.json

Primary tests:
- tests/routing-core.mjs
- tests/fare-core.mjs
- tests/golden-journeys.mjs
- tests/timing-regressions.mjs
- tests/ui-contract.mjs
- tests/repo-integrity.mjs
- tests/browser/rider-flow.spec.mjs
- .github/workflows/test.yml
- .github/workflows/browser-qa.yml

Existing design/evidence documentation:
- docs/routing-architecture.md
- docs/beta-readiness-2026-09-12.md
- docs/network-qa.md
- corridor/pilot/community review documents under docs/

Investigative branch:
- wb2/a9090e4c5607
- docs/beta-audit.md on that branch
- docs/HUMAN_VISUAL_QA.md on that branch
This branch is evidence only; it is not approved wholesale.

## Current official/public transport sources

### PTSC
Routes, fares and published departure lists:
https://ptsc.co.tt/routes-and-schedules/

PTSC terminal/bus-stop directory:
https://ptsc.co.tt/routes-and-schedules-2/schedules/

PTSC service categories/corporate fixed-route descriptions:
https://ptsc.co.tt/routes-and-schedules-2/services/

These sources support current route-existence, fare, timetable, terminal, and service-class claims where the individual source page applies. They do not by themselves provide complete stop-level geometry or live vehicle state.

### Water Taxi / NIDCO
Current service and daily sailing schedule:
https://www.nidco.co.tt/watertaxiservice/

Service overview, terminals, one-way fare:
https://www.nidco.co.tt/water-taxi-service/

Recovery observation: official source publishes POS ↔ San Fernando terminals, TT$15 one-way fare, and weekday directional sailings. No-sailing days/times must be respected by the planner.

### Inter-island ferry
Schedule:
https://www.ttitferry.com/schedule/

Fares:
https://www.ttitferry.com/fares/

Bulletins:
https://www.ttitferry.com/bulletins/

Recovery observation: ferry schedules are dated and can be revised by bulletins. They must not be normalized as timeless static service.

### Maxi taxi / regulatory
Government ttconnect Maxi Taxi Service:
https://ttconnect.gov.tt/maxi-taxi-service/

Ministry of Works and Transport legal notices provide route-area/stand/traffic-control evidence for specific maxi operations. Use the exact legal notice as a claim source rather than generalizing one route-area rule to all maxis.

## Evidence discipline
- Source presence does not mean every field in a legacy record came from that source.
- A source can prove service existence without proving exact boarding point, geometry, fare, schedule, or reverse direction.
- Historical/community evidence remains useful but must retain date and confidence.
- External geocoder/OSM results may resolve Places and physical locations; they do not independently prove an operated transit service.
- Missing source evidence is UNKNOWN, not FALSE.
