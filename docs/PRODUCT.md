# Product specification

Status: authoritative recovery specification, 2026-09-23.

## Product problem
Transit Trinidad exists because a rider in Trinidad and Tobago often knows where they are and where they need to go but does not have one trustworthy source that explains the practical journey across PTSC, maxi taxis, route taxis, marine transport, walking, stands, transfers, fares, and operating constraints.

The product must answer a human question: “How do I actually make this trip?” It is not merely a route atlas and not merely a generic shortest-path graph.

## Primary users
- Residents and commuters who know an origin and destination but not the correct service sequence.
- Riders who know a landmark, neighbourhood, town, school, hospital, mall, or other destination rather than a formal stop name.
- Riders transferring between PTSC, maxi, route taxi, Water Taxi, ferry, and walking connections.
- Visitors or infrequent riders who do not know local stand names, maxi bands, or informal boarding conventions.
- Contributors, drivers, associations, and maintainers who can improve route truth without silently overwriting evidence.

## Core jobs
A rider must be able to:
- resolve an origin and destination from ordinary place language;
- learn where to board and where to get off;
- see one or more valid journey options;
- understand each vehicle/service change and required walk;
- know which claims are verified, reported, estimated, stale, or unavailable;
- see fare information without false precision;
- see schedule/operating information when genuinely known;
- see route geometry bounded to the ridden leg, not a whole route tail;
- recover safely when the network is incomplete or the app cannot justify a route.

A maintainer must be able to:
- ingest source evidence;
- preserve provenance;
- review conflicts;
- promote only justified claims;
- hold uncertain records out of routing without deleting the evidence.

## Current product scope
CONFIRMED:
- Journey planning for Trinidad and Tobago using PTSC, maxi taxi, route taxi, Water Taxi, inter-island ferry where supported, and explicit walking/interchange links.
- Search by local place plus external geocoding for arbitrary landmarks/addresses.
- Directional routing.
- Multiple route options where the evidence supports them.
- Fare ranges/exact fares with confidence.
- Schedule or operating-window information with confidence and freshness.
- Boarding/alighting instructions, including mode-specific local conventions only when evidence supports them.
- Current location as an endpoint when browser support and permission exist.
- Mobile-first rider use.
- Field/association review and controlled promotion.
- Provenance and confidence surfaced to maintainers and, where useful, riders.

## Discussed but not required for the current V2 foundation
CHOSEN as future-capable, not immediate commitments:
- GTFS/static export or another interoperable public data feed.
- Google/Apple map integration or distribution.
- Real-time PTSC/vehicle positions, service alerts, and live arrival predictions.
- Rideshare handoff as an external last-mile option.
- Broader Caribbean reuse.
- Crowdsourced editing beyond a reviewed evidence workflow.

These must not distort the core model before the underlying data is trustworthy.

## Deployment intent
The immediate deployment target is a trustworthy public beta after field-pilot gates are met. Existing documentation correctly separated “technical gate” from “real-world truth gate”; that principle remains authoritative.

A public release is blocked by P0 invented/wrong-direction/impossible-transfer failures, unjustified precision, or unverified critical rider instructions. The 2026-09-12 field-pilot targets remain useful evidence: at least 90% usable local journeys in the pilot sample, zero P0 route-truth failures, at least 80% understandable boarding instructions, and all P0/P1 corrections either resolved or explicitly held.

## Explicit non-goals
- Do not pretend missing route data proves no service exists.
- Do not model Trinidad as if every mode were a fixed-stop GTFS bus network.
- Do not infer an internal transfer solely because two nodes are geographically close.
- Do not label an estimated generic local connector as a verified route taxi service.
- Do not publish synthetic exact times/fares/geometry as fact.
- Do not optimize for route count or record count at the expense of semantic correctness.

## Evidence
Repository baseline: README.md, docs/routing-architecture.md, docs/beta-readiness-2026-09-12.md, current public/app-v2.js, canonical data files, project decision history, and recovery audit at main a9790cb.
Current public sources checked during recovery include PTSC routes/schedules, PTSC terminal listings, NIDCO Water Taxi service, TTIT ferry schedules/fares, and MOWT/ttconnect maxi-taxi material. See docs/DATA.md.
