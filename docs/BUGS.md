# Defect and root-cause ledger

Baseline: recovery audit through 2026-09-23. This ledger intentionally separates raw findings from deduplicated causal clusters.

## Counts: do not add these together
RECOVERED HISTORICAL RAW QA SNAPSHOT: 444 issue/task rows in an earlier network snapshot. The historical categories included endpoint-only geometry, missing/weak fares, approximate boarding locations, confidence gaps, reverse-direction leads, operating-data gaps, disconnected places, and one held service.

CURRENT RAW DETERMINISTIC QA: 594 issue rows when the current src/network-qa-core.mjs logic is replayed against main a9790cb:
- 1 held_service
- 161 approximate_boarding
- 51 reported_service
- 85 fare_missing under the legacy service.fareTTD-only rule
- 189 geometry_endpoints_only
- 36 operation_unknown
- 71 reverse_unconfirmed
- 0 place_disconnected / node_missing_location / orphan_node

PRIOR DEEP AUDIT: 23 grouped findings were reported in the Sprint #23 investigation. Those were already partially deduplicated findings, not the total historical bug count.

These sets are versioned snapshots and overlap heavily. They must not be summed into “number of bugs.”

DEDUPLICATED RECOVERY LEDGER: 37 root-cause/data-gap/quality clusters below. This is the authoritative recovery set for deciding V2 work; it is not a claim that only 37 individual manifestations ever existed.

## Root-cause ledger

### RC-001 — Legacy transit identity conflation
Category: DOMAIN-MODEL DEFECT / ARCHITECTURE DEFECT. Severity: P0.
Symptom: official source rows, service, direction, pattern, and sometimes corridor are represented by one legacy service object. PTSC has 102 rows but only 53 unique endpoint directions and 56 unique stop sequences; past UI could describe source-record counts as “directions.”
Affected: routing identity, schedule/fare attachment, alternatives, counts, admin promotion.
Root cause: record-oriented ingest became canonical operational identity.
Violated invariant: service ≠ direction ≠ pattern ≠ source record; corridor is not direction.
Sibling manifestations: 12-record/2-direction cases, duplicate alternatives, wrong schedule attachment, endpoint-pair matching collisions.
Status: OPEN. V1 sensible fix: no, beyond containment. V2: eliminate structurally with canonical Service/Direction/Pattern/Trip + source claims.

### RC-002 — Physical access point and interchange identity conflation
Category: DOMAIN-MODEL DEFECT. Severity: P0/P1.
Symptom: colocated/same-area terminal/stand concepts can be merged or split inconsistently, enabling false same-node interchange or breaking a real interchange.
Affected: transfers and boarding.
Root cause: physical facility identity and transfer relationship are not modeled separately.
Invariant: colocated Access Points do not imply interchange; distinct points need explicit Transfer Link.
Status: OPEN. V2 structural fix required.

### RC-003 — Informal access policy inferred from weak/prose signals
Category: DOMAIN-MODEL / DATA-CONFIDENCE. Severity: P1.
Symptom: virtual boarding/alighting can be inferred from patternType, operator/boardingNote text, or broad mode assumptions.
Affected: maxi/route-taxi boarding.
Root cause: behavior policy is not complete structured data.
Invariant: corridor hail/request-stop must be explicitly evidenced per Pattern.
Status: OPEN. V2 structured policy + held unknown state.

### RC-004 — Generic local mobility fallback masquerades as route taxi
Category: DOMAIN-MODEL / UX. Severity: P0/P1.
Symptom: short unsurveyed query endpoints can create a synthetic route_taxi service with estimated time/geometry.
Affected: incomplete-data journeys.
Root cause: “helpful fallback” is encoded as transit truth.
Invariant: a generic taxi/rideshare suggestion is not a canonical route-taxi Service.
Status: OPEN and current planner enables it. Remove from canonical routing; optional last-mile suggestion must be separate.

### RC-005 — Routing state is incomplete
Category: ARCHITECTURE DEFECT. Severity: P0.
Symptom: state key is node + lastServiceId + required-mode flag.
Affected: transfer constraints, temporal routing, semantic pattern identity, dominance.
Root cause: static graph shortest path designed before real journey state.
Invariant: state must include active ride/pattern, transfer/boarding count, and temporal context where schedules matter.
Status: OPEN. Rebuild.

### RC-006 — Premature path pruning before schedule/evidence ranking
Category: ARCHITECTURE DEFECT. Severity: P0.
Symptom: one static shortest path is found per start/end/mode variant; timing/ranking happens afterward.
Affected: valid alternatives, missed scheduled services, “best” route.
Root cause: search and journey evaluation are split at the wrong boundary.
Invariant: a path may not be discarded on static cost when later boarding time/constraints can change validity.
Status: OPEN. Rebuild with multi-label/time-aware search.

### RC-007 — Planning mutates shared canonical node state
Category: SOFTWARE / ARCHITECTURE DEFECT. Severity: P0.
Symptom: chooseJourneyOptions/direct fallback inserts query-local virtual nodes into the provided node Map.
Affected: repeated searches, cross-request contamination, tests.
Root cause: query expansion reuses canonical mutable container.
Invariant: planner is pure with respect to network snapshot.
Status: OPEN. V1 patch possible, but V2 must make snapshot immutable.

### RC-008 — Internal transfers generated from geographic proximity
Category: ARCHITECTURE / DOMAIN-MODEL DEFECT. Severity: P0.
Symptom: localConnectorTransfers can connect disconnected corridor fragments within a configured distance; current planner enables bridge fallback.
Affected: invented transfers and impossible journeys.
Root cause: distance used as authorization rather than review signal.
Invariant: internal transfer requires explicit TransferLink evidence.
Status: OPEN. Remove; existing tests requiring it are obsolete.

### RC-009 — Max-transfer limit absent from search
Category: SOFTWARE / ARCHITECTURE DEFECT. Severity: P1.
Symptom: golden data can state maxTransfers but findJourney/chooseJourneyOptions do not enforce an equivalent search constraint.
Affected: impractical itineraries.
Root cause: transfer count absent from state.
Invariant: request constraints are enforced during expansion, not merely displayed.
Status: OPEN. Structural V2 fix.

### RC-010 — Service eligibility uses trip-start date instead of actual boarding time
Category: ARCHITECTURE / SCHEDULE DEFECT. Severity: P0/P1.
Symptom: eligibleServices filters against departureDate before path search, while later leg boarding may occur on another service day.
Affected: late-night/midnight/long-transfer journeys.
Root cause: timetable not integrated into search state.
Invariant: schedule is evaluated at actual boarding timestamp/local operating day.
Status: OPEN. Rebuild.

### RC-011 — Fare boundary can follow graph steps instead of rider legs
Category: DOMAIN-MODEL / SOFTWARE DEFECT. Severity: P0/P1.
Symptom: fareForJourney sums every transit step unless caller first compacts; raw graph traversal emits stop-to-stop transit steps.
Affected: multi-stop fares; historical overcharge class.
Root cause: graph Segment conflated with fare/ride Leg.
Invariant: contiguous same-ride Segments assemble before fare evaluation.
Status: OPEN structurally. App mitigates via compaction; V2 eliminates API footgun.

### RC-012 — Dual fare authorities and fare shadowing
Category: DATA / ARCHITECTURE DEFECT. Severity: P1.
Symptom: fare can live on service.fareTTD and/or fares.json; QA calls service.fareTTD absence “missing” even when fare record exists.
Affected: display, QA, promotion, interpolation.
Root cause: migration introduced new fare store without removing legacy authority.
Invariant: one canonical FareRule path; legacy fields are migration inputs only.
Status: OPEN. Migrate.

### RC-013 — Partial fare could exceed known full-route fare
Category: SOFTWARE BUG. Severity: P1. Status: FIXED on main a9790cb.
Symptom: shorter POS→Dabadie / Chaguanas→Claxton Bay ranges could exceed known full-route max.
Root cause: interpolation not capped and fares.json full-route record ignored by one path.
Invariant: derived partial fare respects applicable known full-route bound.
Sibling: both legacy service fare and fare-record paths.
V2: preserve regression/property test.

### RC-014 — Planner date and schedule-detail date disagree
Category: UX / SOFTWARE DEFECT. Severity: P1.
Symptom: UI can hold selectedScheduleDate for detail while planCurrentTrip calls planner with new Date().
Affected: future trip planning and schedule messaging.
Root cause: two date sources.
Invariant: one PlanRequest departure timestamp drives route legality and display.
Status: OPEN.

### RC-015 — Exact timetable semantics unavailable for intermediate boarding
Category: DATA / SCHEDULE DEFECT. Severity: P1/P2.
Symptom: journey timing uses exact published wait only when boarding at legacy service origin; intermediate boarding falls back to generic mode wait.
Affected: PTSC intermediate stops.
Root cause: schedules are route-level departure lists without stop-time model.
Invariant: do not present origin departure times as exact stop times.
Status: OPEN limitation. V2 may keep unknown/estimated intermediate wait until stop times exist.

### RC-016 — No canonical route geometry
Category: DATA GAP. Severity: P1.
Symptom: 189/189 service rows endpoints_only; zero canonical geometry arrays.
Affected: map path truth, access projection, distance.
Root cause: source collection focused on endpoints/routes before shapes.
Invariant: geometry confidence must match actual evidence.
Status: OPEN. Data collection required; routing may still use topology where valid.

### RC-017 — Estimated road geometry can look more authoritative than evidence
Category: DATA-CONFIDENCE / UX DEFECT. Severity: P1.
Symptom: OSRM/heuristic route lines can visually resemble actual transit path; branch experiments infer corridor semantics from prose.
Affected: map trust and boarding.
Root cause: display fallback and canonical transit geometry not strongly separated.
Invariant: estimated display geometry never establishes service/path identity.
Status: OPEN. V2 confidence-bearing geometry adapter.

### RC-018 — Journey geometry trailing beyond rider’s alighting point
Category: SOFTWARE / UX DEFECT. Severity: P1. Status: FIXED/REGRESSION-GUARDED in current lineage.
Symptom: highlighted service line continued past the requested ridden segment.
Root cause: full service shape/fallback not consistently sliced to leg endpoints.
Invariant: display only ridden section.
V2: preserve bounded-geometry regression on canonical shapes and fallback.

### RC-019 — Boarding coordinates imply more precision than evidence
Category: DATA-CONFIDENCE ISSUE. Severity: P1.
Symptom: 59 nodes are approximate_area; 161 current raw QA manifestations arise from approximate endpoints/nodes.
Affected: “where do I board?” trust.
Root cause: approximate coordinates used because exact stand/stop data unavailable.
Invariant: coordinate precision and location confidence are distinct.
Status: OPEN data collection; UI must preserve uncertainty.

### RC-020 — Operating/schedule coverage is materially incomplete and promotion is append-biased
Category: DATA GAP / ADMIN DEFECT. Severity: P1.
Symptom: 76 schedules but only 5 published_times; official PTSC currently exposes many times. PTSC promotion only inserts schedule when no overlapping serviceDays row exists, which can block replacement/upgrades.
Affected: time routing.
Root cause: source capture/promotion semantics treat “schedule exists” as sufficient.
Invariant: newer stronger dated evidence can supersede/replace weaker schedule claims through explicit versioning.
Status: OPEN. Rebuild schedule normalization/promotion.

### RC-021 — Reverse-direction gaps are ambiguous evidence
Category: DATA GAP / TESTING DEFECT. Severity: P1.
Symptom: 71 current QA reverse_unconfirmed rows; absence can be treated as no reverse in routing while also not proving no service exists.
Affected: reverse journeys/user messaging.
Root cause: incomplete data mixed with negative behavior.
Invariant: “not represented” ≠ “does not exist.”
Status: OPEN. Router may not invent reverse, but UI must say data gap unless nonexistence is positively known.

### RC-022 — Curated landmark/POI layer absent
Category: DATA GAP / UX. Severity: P2.
Symptom: 36 canonical Places are localities; no landmark/POI kinds.
Affected: ordinary rider destination search.
Root cause: external geocoder compensates for a missing curated layer.
Status: OPEN. Add top landmarks after routing foundation.

### RC-023 — Stored transfer links lack full physical/interchange validation
Category: DATA-CONFIDENCE ISSUE. Severity: P1.
Symptom: 88 explicit stored walk links are all estimated_walk; physical barriers/entrances/accessibility not systematically encoded.
Affected: transfers.
Root cause: geospatial estimate used before field validation.
Invariant: a critical interchange must be physically plausible and source-backed.
Status: OPEN audit. Preserve records as candidates/evidence, not unquestioned truth.

### RC-024 — Formal stands/terminals are not first-class autocomplete suggestions
Category: UX DEFECT. Severity: P1/P2.
Symptom: local matchPlaces searches places.json; explicitNetworkNode supports exact typed node names but local suggestion list is place-centric. Prior audit found formal network points effectively absent from autocomplete.
Affected: riders who know a terminal/stand.
Root cause: search index split between Places and nodes.
Invariant: search can resolve both rider Places and explicit Access Points with clear type labels.
Status: OPEN.

### RC-025 — User-visible counts inherit legacy record semantics
Category: UX / DOMAIN-MODEL DEFECT. Severity: P2.
Symptom: “directions/services/corridors” have historically been counted from incompatible record levels.
Affected: route directory/network summary.
Root cause: RC-001.
Invariant: every count has a domain-defined entity.
Status: OPEN until V2 identity migration.

### RC-026 — Mobile rendered behavior is under-verified
Category: UX / TESTING DEFECT. Severity: P1/P2.
Symptom: historical audit found misplaced controls; current automated mobile test checks width/touch target/basic panel bounds but map is stubbed.
Affected: primary outdoor one-handed use.
Root cause: source/test assertions substituted for rendered QA.
Status: OPEN verification requirement.

### RC-027 — Tests require rejected proximity/direct fallback behavior
Category: TESTING DEFECT. Severity: P0/P1.
Symptom: routing-core explicitly asserts bridge fallback connects nearby fragments; browser test requires synthetic local route-taxi fallback.
Root cause: tests memorialized implementation workarounds before product truth was recovered.
Invariant: tests are subordinate to domain/product spec.
Status: OPEN; rewrite/remove in V2.

### RC-028 — Browser QA over-mocks map and route integration
Category: TESTING DEFECT. Severity: P1.
Symptom: MapLibre class and OSRM are stubbed; screenshots are not production rendering.
Affected: map path, styling, state, external integration.
Root cause: deterministic E2E used as sole visual proof.
Status: OPEN; keep mocked tier, add real-render tier.

### RC-029 — UI contract tests mirror source implementation
Category: TESTING DEFECT. Severity: P2.
Symptom: regex assertions require specific source strings/CSS values/imports.
Affected: refactors and false confidence.
Root cause: implementation-shape tests stand in for behavioral assertions.
Status: OPEN; retain only true structural invariants.

### RC-030 — Legacy golden journeys are weak truth fixtures
Category: TESTING DEFECT. Severity: P1.
Symptom: 33 rows mainly encode from/to/maxTransfers/requiredMode and lack authoritative expected service sequence, time, fare, geometry confidence, and uncertainty.
Affected: regression quality.
Root cause: “golden” naming exceeded evidence content.
Status: OPEN. Rebuild with verified/pending classes.

### RC-031 — QA metrics conflate manifestations and use legacy fields
Category: TESTING / DATA-QUALITY DEFECT. Severity: P2.
Symptom: 594 current raw rows overstate independent problems; fare_missing ignores fares.json; approximate boarding can be counted at node and service.
Affected: prioritization/trust.
Root cause: issue report designed for field-task generation, later interpreted as bug total.
Status: OPEN. V2 QA reports raw manifestations + causal classes + coverage separately.

### RC-032 — Promotion matching can update the wrong semantic service or downgrade truth
Category: ADMIN / DOMAIN-MODEL DEFECT. Severity: P0/P1.
Symptom: association ingest locates an existing service primarily by mode + endpoint pair; legacy promotion works on conflated service records. Prior audit also found downgrade risk.
Affected: canonical truth.
Root cause: no claim-level conflict resolution and no canonical Pattern identity.
Invariant: weaker/new source cannot silently replace stronger/different service truth.
Status: OPEN. V2 claim/proposal/reviewer model.

### RC-033 — Deployment protections are insufficiently established
Category: DEPLOYMENT/OPS DEFECT. Severity: P1.
Symptom: recovery read no GitHub rulesets; only test/browser workflows are in repo; historical audit reported ungated Pages deployment.
Affected: release integrity.
Root cause: release path not explicitly modeled as protected promotion.
Status: OPEN/partly UNKNOWN until hosting is re-verified. V2 beta requires gated deploy + rollback.

### RC-034 — Production observability / route-decision trace is absent
Category: DEPLOYMENT/OPS DEFECT. Severity: P2.
Symptom: no durable trace explains why planner chose/rejected an itinerary in beta.
Affected: diagnosing real-world wrong routes and data gaps.
Root cause: static MVP architecture.
Status: OPEN. Add privacy-safe planner trace before wide beta.

## Deduplication rule
A manifestation belongs to the earliest causal cluster that would prevent it by construction. Example: “12 directions shown” belongs to RC-001/RC-025, not a new architecture bug for each duplicated PTSC row. Conversely, schedule-date mismatch (RC-014) and boarding-time eligibility (RC-010) remain separate because either can exist without the other.


### RC-035 — Travel-time estimates imply unsupported operational precision
Category: DATA-CONFIDENCE / ARCHITECTURE DEFECT. Severity: P1.
Symptom: when a service lacks explicit estimatedMinutes, V1 estimates whole-service travel time from straight-line endpoint distance multiplied by a mode factor/speed; multi-stop segment times are then apportioned using straight-line distances between stops.
Affected: route ranking, ETA ranges, transfer timing, schedule compatibility.
Root cause: topology and approximate geography are being used as a substitute for operational travel-time evidence.
Invariant: an ETA must carry its derivation/confidence and must not appear more precise than the underlying travel-time evidence.
Sibling manifestations: detouring routes scored too optimistically; stop-to-stop time distributed incorrectly; estimated wait plus estimated ride presented as one apparently coherent duration.
Status: OPEN. V2 must make travel-time model/evidence explicit and confidence-bearing.

### RC-036 — Origin/destination local access can complete a journey without evidence of that connector
Category: DOMAIN-MODEL / UX / DATA-CONFIDENCE DEFECT. Severity: P1.
Symptom: access beyond the walk threshold becomes a generic “local” connection with assumed wait/speed; selected formal marine journeys receive special tolerance for otherwise untrusted local access.
Affected: first/last mile, marine alternatives, total ETA, rider expectations.
Root cause: access estimation and verified transit connectivity are mixed in one journey score.
Invariant: a verified transit leg does not verify the rider’s first/last-mile connection. Generic taxi/rideshare/local access must be a separate, explicitly estimated access option or an evidence-backed service.
Status: OPEN. V2 separates query-local access options from canonical transit and exposes their confidence independently.


### RC-037 — Ambiguous free-text endpoint can silently resolve to the geocoder’s first match
Category: UX / SOFTWARE DEFECT. Severity: P1.
Symptom: autocomplete can present choices, but if the rider types free text and plans without selecting one, geocodePlace requests a single Nominatim result (limit=1) and uses it without a disambiguation step.
Affected: landmark/locality ambiguity, wrong origin/destination, downstream wrong route.
Root cause: endpoint resolution treats geocoder ranking as rider intent.
Invariant: materially ambiguous Places require explicit disambiguation or sufficient locality evidence; external rank is not silent product truth.
Status: OPEN. V2 search/endpoint resolution must return typed candidate sets and an ambiguity state.
