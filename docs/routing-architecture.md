# Transit Trinidad routing architecture

## Product target

Build a Trinidad and Tobago journey planner with the interaction quality people expect from major map products while preserving the realities of local shared transport. The architecture must support incomplete data today and become more precise as PTSC, taxi associations, Maxi associations, ferry operators and drivers provide better information.

The core rule is simple: **places are not stops, stops are not routes, routes are not schedules, and schedules are not live vehicle positions.** Each layer can improve independently.

## 1. Place layer

A place is what the rider searches for: Couva, Chaguanas, Crown Point, C3 Centre, an address or a business.

Stored fields:

- `id`
- `name`
- `aliases`
- `kind`
- centroid `location`
- bounded `routingRadiusKm`
- provenance

A place never becomes a boarding point by itself. The router searches compatible network nodes near the place. Explicit searches such as `Scarborough Ferry Terminal` may bind directly to a network node.

Canonical file: `data/places.json`.

## 2. Network-node layer

A node is a transport location or transport area used by services and transfers.

Examples:

- PTSC terminal
- mapped taxi stand
- mapped Maxi platform
- ferry terminal
- approximate pickup zone

Location confidence remains separate from route confidence. A route can be well-supported even when its exact bay is still approximate.

Canonical file: `data/nodes.json`.

## 3. Service-pattern layer

A service pattern is one directed movement riders can actually board. Reverse directions are separate records and are never synthesized.

Important fields:

- `corridorId`: rider-facing route family
- `id`: directed service pattern
- `mode`
- `operator`
- ordered `stopNodeIds`
- `serviceConfidence`
- `geometryConfidence`
- `fareTTD` + `fareConfidence`
- `scheduleConfidence`
- sources

Maxi colour bands classify service areas; they do not create through-routes.

Canonical file: `data/services.json`.

## 4. Transfer layer

Transfers represent actual movement between distinct boarding points. A transfer is not implied because two nodes are in the same town.

Examples:

- PTSC terminal to nearby Maxi stand
- ferry terminal to taxi stand
- San Fernando Maxi stand to route-taxi stand

Canonical file: `data/transfers.json`.

## 5. Schedule layer

Schedules attach to service patterns. Static schedules are never described as live tracking.

Future association data may support:

- first/last service windows
- approximate headways
- weekday/weekend variations
- published departures

Canonical file: `data/schedules.json`.

## 6. Routing layer

Routing happens in two stages.

### Graph legality

Find directed paths through services and explicit transfers. Reject held services, nonexistent reverse directions and loops.

### Rider-quality ranking

Rank legal paths using:

- origin access distance
- destination egress distance
- known versus generic access
- transit estimate
- explicit transfer walking
- number of transfers
- detour ratio
- directional backtracking
- service confidence
- schedule availability where useful

This keeps graph-valid but rider-absurd journeys out of the first position.

## 7. Presentation layer

Directions should read as actions:

1. Get to the named stand or pickup area.
2. Take the named mode/band toward a destination.
3. Exit at the named hub or stand.
4. Walk an explicit transfer when required.
5. Continue on the next service.

Uncertainty is metadata, not repeated prose. Use compact badges such as `Reported route`, `Fare unknown`, `No timetable`, `Published timetable`, and one global map notice explaining the limits of the current dataset.

## Association / driver data contract

When an association helps us improve a corridor, collect each category independently.

### Route identity

- association/operator name
- local route name
- mode
- direction A → B
- whether the reverse direction exists
- Maxi band if applicable

### Boarding

- exact origin stand or main-road pickup zone
- exact destination stand/drop zone
- intermediate pickup/drop zones
- GPS coordinates when possible
- common landmark instructions

### Operation

- days normally operating
- typical first service
- typical last service
- rough frequency or dispatch pattern
- known peak/off-peak differences

### Fare

- current fare per passenger
- segment-based fare rules if applicable
- date last confirmed

### Geometry

- actual roads normally used
- accepted deviations/short turns
- whether vehicles may leave the corridor for pickups

### Future live layer

Keep live information separate from static route data:

- vehicle ID
- driver/operator ID
- current coordinate
- timestamp
- direction/service pattern
- seats available / capacity state
- accepting advance pickups

That future layer can power vehicle positions, capacity and advance-seat booking without changing the core route graph.

## Capability ladder

### Current / near-term

- place search
- multimodal journey planning
- directed Maxi/taxi/PTSC/ferry patterns
- explicit transfers
- route alternatives
- estimates
- partial fares and timetables
- evidence/provenance

### Association-enhanced

- precise stands
- richer route geometry
- current fares
- service windows/headways
- stronger operating confidence

### Live network

- vehicle GPS
- arrival predictions
- capacity
- disruption status
- advance pickup / seat reservation
- digital payment

The architecture should evolve by filling these layers, not by replacing the router every time the data improves.
