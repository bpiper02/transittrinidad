# Data audit and trust matrix

Baseline: canonical files on main a9790cb, inspected 2026-09-23. Counts describe this snapshot, not permanent completeness.

## Snapshot counts
- Access-like nodes: 108
- Curated rider places: 36
- Legacy service records: 189
- Legacy corridor IDs: 103
- Stored transfer records: 88
- Fare records: 85
- Schedule records: 76
- Legacy golden-journey rows: 33

Service rows by mode:
- PTSC 102
- Route taxi 44
- Maxi 39
- Water Taxi 2
- Ferry 2

## Referential integrity
CONFIRMED in this snapshot:
- no broken service-to-node references found;
- no broken stored transfer-to-node references found;
- no broken service-scoped fare references found;
- no broken schedule-to-service references found;
- no orphan nodes under the current checker’s “used anywhere” definition;
- one held needs_review service.

This is useful but does not prove semantic correctness.

## Identity / duplication
PTSC has 102 legacy records but only 53 unique endpoint-direction pairs and 56 unique stop sequences. Multiple official records share the same corridorId, origin, destination, and stop sequence. That is evidence that current record identity is not rider-service identity.

This is the clearest current example of fake uniqueness. Do not “deduplicate” by deleting records: migrate each raw official record to evidence/operating data and map it to canonical Service/Direction/Pattern identities.

## Data trust matrix

| Data class | Exists | Verified/strong | Approximate/weak | Missing | Safe for routing now? | Safe to display now? | V2 action |
|---|---|---|---|---|---|---|---|
| Place localities | 36 | aliases/centroids generally source-backed | centroid access is approximate | landmarks/POIs absent | as query targets only | yes with place semantics | KEEP/MIGRATE |
| Access points | 108 | 38 mapped_station | 59 approximate_area; 11 no locationConfidence value | many fine-grained stops unknown | only with access-confidence rules | yes if uncertainty shown | MIGRATE + audit |
| PTSC legacy service rows | 102 | existence/source evidence is substantial | identity grouping is conflated | pattern detail varies | not as V2 identity | source info yes | MIGRATE raw records into claims/entities |
| Maxi service rows | 39 | useful route/band evidence | policies/geometry incomplete | broader network likely incomplete | limited, evidence-gated | yes with confidence | MIGRATE + field validation |
| Route-taxi rows | 44 | useful stand/corridor evidence | many reported/informal claims | boarding policies, geometry, fares/ops gaps | limited | yes with confidence | MIGRATE + collect |
| Water Taxi | 2 directions | official terminals/fare/current schedule source | geometry still absent | disruption/live status | yes after schedule migration | yes | KEEP/MIGRATE |
| Ferry | 2 directions | official terminals/fares | schedule is date/bulletin-sensitive | current canonical exact trips | topology yes, time routing not yet | fares/terminal yes; schedules only if fresh | MIGRATE |
| Corridors | 103 IDs | some useful family labels | many IDs carry directional/service semantics | canonical family normalization | no as identity | labels selectively | REBUILD/MIGRATE |
| Directions | embedded in service rows | many declared one-way records | reverse gaps are ambiguous | canonical Direction entities | not as durable identity | route direction only when sourced | REBUILD |
| Patterns | stopNodeIds embedded | some ordered sequences source-backed | many endpoint-only/duplicate | explicit pattern identity/policies | partially | cautiously | REBUILD/MIGRATE |
| Transfers | 88 stored, all symmetric | source-backed locations | all confidence estimated_walk; physical feasibility not fully verified | accessibility/facility detail | only after transfer audit for V2 | can display as estimate where already proven | MIGRATE |
| Fares | 85 fare records + legacy fareTTD fields | 77 fare records official_current | 8 fare records estimated; duplicated storage paths | 74 routable legacy services lack explicit fare source by recovery check | fare should not drive legality | yes with confidence | MIGRATE to FareRule |
| Schedules | 76 records / 75 services | 5 published_times records | 71 times_unavailable are metadata, not timetable | large timetable/frequency gaps | topology only; time routing incomplete | yes if “times unavailable” is clear | REBUILD/MIGRATE |
| Geometry | 0 canonical shapes | none in service data | all 189 endpoints_only | route shapes network-wide | no for route-path truth | straight/road fallback only if labeled estimate | COLLECT/REBUILD |
| Provenance | widespread sources arrays | all service rows have at least one source | confidence often record-level/coarse | atomic claim links | useful | useful in evidence UI | KEEP + normalize |
| Golden journeys | 33 rows | connectivity assertions | weak expected semantics | fare/time/geometry/uncertainty outcomes | no as authoritative truth | n/a | REBUILD fixtures |

## Node/location quality
Current node kinds: 58 stop_zone, 37 stand, 8 terminal, 2 Water Taxi terminal, 2 ferry terminal, 1 hub.
Location-confidence values: 59 approximate_area, 38 mapped_station, 11 missing the field.
Do not interpret “has coordinates” as “precise boarding location.”

## Transfer audit
All 88 stored transfer records are walk mode, confidence estimated_walk, with distances approximately 0.08–1.038 km, and each currently has a reverse record. This is much safer than runtime-generated proximity bridges, but still needs a physical-interchange review: road barriers, entrances, walkability, stand-side direction, accessibility, and whether the transfer is actually normal for riders.

## Fare audit
Current network QA says 85 “fare_missing” because it checks only legacy service.fareTTD. That is a QA defect: fares.json separately covers 85 service IDs. Recovery found 74 routable service rows with neither service.fareTTD nor a service-scoped fare record.

The September 17 fare-monotonicity bug is fixed in a9790cb and has regression coverage. Preserve that invariant in V2, but eliminate dual authoritative fare storage.

## Schedule audit
76 schedule records cover 75 legacy service IDs. Only five are published_times; 71 say times_unavailable. The current official PTSC web surface exposes many current departure lists, so canonical capture is materially behind what is publicly available. Water Taxi also publishes weekday directional sailings; ferry schedules are dated and subject to bulletins.

“times_unavailable” must never be counted as schedule completeness.

## Geometry audit
All 189 legacy service rows are endpoints_only and have no canonical geometry array. Any rider route line in V1 is therefore derived from stops/OSRM/heuristics, not authoritative transit geometry.

## Source quality
Strong/current examples: PTSC official routes/schedules and terminal pages; NIDCO Water Taxi service; TTIT ferry schedule/fare pages; MOWT/ttconnect regulatory/stand material.
Other evidence includes OSM, association/passenger reports, news/traffic schemes, and historical guides. Preserve these, but freshness and claim scope must be explicit.

## Data collection priorities
1. PTSC semantic normalization and timetable re-ingest.
2. Transfer/interchange physical audit for critical hubs.
3. Pattern geometry for top rider corridors.
4. Boarding/alighting policy for maxi and route taxi.
5. Fare gaps on top journeys.
6. Operating windows/frequency for informal modes.
7. Curated landmarks that improve rider search.
8. Ferry dated schedule ingestion with validity windows.
