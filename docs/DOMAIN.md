# Canonical domain model for V2

The V1 “service” record carries too many meanings. V2 separates rider concepts, physical places, operational identity, patterns, schedules, fares, and evidence.

## Core entities

### Place
Definition: rider-facing geographic destination/origin such as town, neighbourhood, landmark, address, school, hospital, mall, or current location.
Identity: stable canonical place ID when curated; query-local ID for geocoder/current-location results.
Relationships: may have nearby/access links to Access Points.
Invariant: Place is not automatically a graph boarding node.
Source: OSM/geocoder/curated local evidence.
Derived: candidate access points and walking access.
Lifecycle: curated places may be updated; query-local places are ephemeral.

### Access Point
Definition: a physical or area location at which a rider may board/alight or enter a terminal/stand. This is the general physical-node concept.
Subtypes: Stop, Stand, Terminal, Stop Zone, Marine Terminal.
Identity: physical/operational place, not a service ID.
Invariant: colocated Access Points are not automatically identical and do not automatically interchange.

### Stop
A fixed designated boarding/alighting point. PTSC may use formal stops; some local services do not.

### Stand
A designated queue/dispatch/boarding area associated with one or more local services. A stand may be near a terminal without being the same Access Point.

### Terminal
A facility/compound with one or more Access Points and possible transfer relationships. Terminal identity is physical; service identity is separate.

### Corridor
Definition: a route-area/geographic or rider-recognizable route family.
Identity: non-directional family unless the real-world named concept itself is directional.
Relationships: may contain several Services/Patterns and mode-specific route-area metadata.
Invariant: corridorId must never be used as a direction or trip identity.

### Service
Definition: stable rider/operational offering by an operator within a corridor or route family.
Examples: a PTSC named service class/route family; a maxi route-area service family.
Relationships: has one or more Directions/Patterns; Fare Rules and schedules may apply at this or lower scope.
Invariant: two official records with the same endpoints are not necessarily two rider-distinct Services.

### Direction
Definition: travel orientation within a Service, e.g. outbound/inbound or A→B.
Identity: Service + direction semantics, not geometry.
Invariant: reverse existence is explicit; never synthesize it from the forward direction.

### Pattern
Definition: an ordered operational path variant in one Direction: sequence of Access Points/route sections plus boarding/alighting policy and geometry.
Identity: Service + Direction + operational variant.
Relationships: contains ordered Pattern Points/Segments; used by Trips.
Invariant: routing identity comes from Pattern order and policies, never from a map polyline alone.

### Trip
Definition: a scheduled departure/instance of a Pattern when exact departures are known.
Identity: pattern + service date + departure/event ID.
For frequency-based informal service, exact Trip instances may not exist; use an Operating Window/Frequency Rule instead.

### Segment
Definition: movement between adjacent positions in one Pattern.
Purpose: graph/routing internal structure.
Invariant: Segment is not a rider transfer and not automatically a fare charge.

### Leg
Definition: rider journey from one boarding event to one alighting event while staying on one vehicle/service-pattern context.
Relationships: spans one or more Segments.
Invariant: one continuous ride is one Leg even if graph traversal uses many Segments.

### Interchange
Definition: a physical complex or documented relationship where transfer between distinct Access Points is feasible.
Identity: explicit entity/evidence.
Invariant: distance alone cannot create an Interchange.

### Transfer Link
Definition: directed or bidirectional allowed movement between Access Points, normally walking, inside a journey.
Fields: from, to, estimated/verified walk time/distance, accessibility if known, source, confidence.
Invariant: must have explicit evidence or reviewed survey; no automatic internal proximity links.

### Fare Rule
Definition: a rule that prices a Leg/Journey according to service/pattern, endpoints/zones, passenger class, date, or ticket class.
Invariant: evaluated on rider leg/fare context, not graph edge count.
Unknown fare is valid state.

### Schedule / Operating Rule
Definition: calendar, exact departures, service windows, headways, dated exceptions, or “times unavailable.”
Identity: scope + validity interval + source.
Invariant: “times unavailable” is metadata, not a timetable.

### Operating Day
Definition: local service-date concept in America/Port_of_Spain, distinct from an arbitrary UTC date.
Purpose: evaluate services that cross midnight and dated exceptions.

### Route Geometry
Definition: path shape for a Pattern/Direction, with source and confidence.
Invariant: shape is display/travel-path evidence, not service identity. Endpoint-only/OSRM estimates must be visibly lower-confidence and cannot masquerade as verified transit path.

### Boarding Event / Alighting Event
Definition: journey-specific event tying a Leg to an Access Point or explicitly supported corridor access position.
Query-local virtual positions are allowed only when a structured Pattern access policy and evidence permit them.
Invariant: query-local positions never mutate canonical network state.

### Landmark
Definition: curated Place subtype useful to riders but not necessarily a transit node.
V1 canonical places contain no landmark/POI records; external geocoding currently fills this gap.

### Source / Evidence Claim / Provenance
Source: document, web page, law, OSM object, association contact, field observation, passenger report, etc.
Evidence Claim: atomic assertion supported by one or more Sources: service exists, stop location, fare amount, schedule, boarding policy, geometry.
Provenance: source ID, checked/received date, extraction/promotion history.
Invariant: canonical entities should reference claims; confidence should apply to the claim being made, not as one overloaded record-level score.

### Confidence / Data Quality
Recommended dimensions:
- existence confidence;
- location confidence;
- operational/pattern confidence;
- fare confidence;
- schedule confidence;
- geometry confidence;
- freshness.
Do not compress these into one score.

## Mode-specific semantics

### PTSC
Fixed-route public bus operator. Official pages can contain multiple records for the same broad endpoint pair with different stop/service classes/times. Model these as Services/Patterns/Trips, not “directions.” Current 102 PTSC records reduce to 53 unique endpoint directions and 56 unique stop sequences, demonstrating fake uniqueness in V1.

### Maxi taxi
Regulated route-area/band system with stands and corridor behavior. A band/route area is not a single service and does not imply every point is boardable. Boarding/alighting policy is route/pattern evidence. Preserve official band color semantics.

### Route taxi
Shared taxi services commonly organized around stands/corridors. Do not assume hail/request-stop behavior universally. Generic “hail a taxi/rideshare” last-mile movement is not a canonical route-taxi Service.

### Water Taxi
Fixed terminals, directional scheduled sailings, official fare. Current official NIDCO evidence supports POS ↔ San Fernando and TT$15 one way. Strong candidate for early golden journeys.

### Inter-island ferry
Fixed marine terminals with dated/vessel-specific schedules and fare classes. Do not encode a rolling bulletin as timeless static schedule. Fare rules vary by passenger/vehicle/class.

### Walking / interchange
Walking is a Journey mode/Transfer Link, not a transit Service. Origin/destination walking access may be computed to known Access Points; internal interchange must be explicitly evidenced.

## V1 conflations to eliminate
- service = direction = pattern = official source record;
- corridor IDs that are themselves directional service-like IDs;
- graph edge = rider leg = fare charge;
- nearby nodes = transfer;
- endpoint road estimate = route geometry;
- generic local mobility fallback = route-taxi service;
- schedule record existence = operating truth;
- record count = network completeness.
