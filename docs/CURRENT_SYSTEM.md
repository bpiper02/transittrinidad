# Current system evidence map

Baseline: main a9790cb87055c9d9aa548e0119de6ac8fd80d837, inspected 2026-09-23.

## Repository surfaces inspected
- README.md and package.json
- src/ routing, timing, schedule, fare, geometry, place, data-contract, QA, field/association/PTSC ingest/promotion modules
- public/ planner, map/UI shell, field-review UI
- data/ nodes, places, services, transfers, fares, schedules, golden journeys and source-rich records
- tests/ core, golden, timing, UI-contract, repo-integrity, browser rider flow
- .github/workflows/test.yml and browser-qa.yml
- docs/ routing architecture, beta readiness, network QA, corridor/pilot/evidence material
- branch wb2/a9090e4c5607 and its beta/visual audit notes
- recent commit history through the September 12–18 bug-fix/data-promotion period

## Canonical data snapshot
- 108 nodes
- 36 curated places
- 189 legacy service records across 103 corridor IDs
- modes: 102 PTSC, 44 route taxi, 39 maxi, 2 Water Taxi, 2 ferry
- 88 explicit stored walking-transfer records
- 85 fare records
- 76 schedule records
- 33 legacy “golden journey” rows
- 1 service held as needs_review
- 189/189 service records have endpoint-only geometry; 0 have canonical route shapes
- node location confidence: 59 approximate_area, 38 mapped_station, 11 without a locationConfidence value
- PTSC: 102 records but only 53 unique endpoint directions and 56 unique stop sequences
- schedules: 5 published_times, 71 times_unavailable, spanning 75 services
- fares: 77 official_current records, 8 estimated records
- canonical places contain towns/villages/localities, not landmark/POI records
- all stored transfer links are symmetric in the current file and are estimated_walk; distances range roughly 0.08–1.038 km

## Current QA raw count
Re-running the logic of src/network-qa-core.mjs against the canonical snapshot yields 594 issue rows:
- 1 held service
- 161 approximate_boarding manifestations
- 51 reported_service manifestations
- 85 fare_missing manifestations under the legacy fareTTD-only heuristic
- 189 endpoint-only geometry manifestations
- 36 operation_unknown manifestations
- 71 reverse_unconfirmed manifestations
- 0 disconnected places / missing-location nodes / orphan nodes under that checker

This is not 594 independent bugs. For example, all 189 geometry rows share one network-wide data-class deficiency, and the fare-missing metric ignores separate fares.json coverage.

## Current routing behavior
src/routing-core.mjs:
- graph edges are generated directly from each legacy service stop sequence;
- Dijkstra state key is node + lastServiceId + required-mode-used flag;
- schedule time and transfer count are not search-state dimensions;
- a single shortest path is returned before schedule/evidence scoring;
- query-created virtual access nodes can be inserted into the supplied node Map;
- optional localConnectorTransfers creates internal estimated links by geographic proximity;
- current public planner enables corridor bridge fallback and direct local fallback;
- direct local fallback creates a synthetic route_taxi service between query endpoints.

## CI evidence
The latest baseline SHA has successful GitHub Actions runs for test and browser-qa, but GitHub combined commit status has no classic status contexts and repository rulesets returned empty during recovery. Passing CI therefore proves the tests passed, not that current semantics are correct.

## Investigative branch
wb2/a9090e4c5607 is one commit ahead of main and adds map-style/mode state, geometry helpers, and visual-QA notes. It does not resolve the recovered domain/routing defects and must not be merged wholesale. Useful pieces can be cherry-picked only after independent review against docs/DESIGN.md and V2 boundaries.
