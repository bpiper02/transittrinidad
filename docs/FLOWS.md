# Rider and maintainer flows

Each flow records trigger, inputs, system decisions, visible output, failures/uncertainty, and recovery. These are behavioral requirements, not screen descriptions.

## F1 Plan a known origin to known destination
Trigger: rider wants to travel now or at a chosen departure time.
Inputs: origin place, destination place, optional mode preference and departure time.
System:
1. resolve each input to a Place or explicit Access Point without silently snapping to a service;
2. find evidence-backed origin access options;
3. run time-aware routing over canonical patterns and explicit transfers;
4. assemble graph segments into rider legs;
5. evaluate schedule at actual boarding times, fare rules at leg level, and geometry for only ridden sections;
6. return non-dominated alternatives.
Output: route options with board, ride, alight, walk/transfer, fare, duration range, operating/schedule evidence, and confidence.
Failure: unknown place, no supported access point, no verified path, service not operating, data gap.
Recovery: distinguish “no verified route in current data” from “service does not exist”; suggest nearby known access points or a separate clearly labeled last-mile option only when justified.

## F2 Rider knows a landmark, not a stop
Trigger: “I’m going to Gulf City / a hospital / school / address.”
Inputs: free text or map/current location.
System: local alias index first, then Trinidad-bounded external geocoder; preserve the landmark as a Place and find nearby verified boarding/alighting access.
Output: landmark remains the journey endpoint; directions explain the walk/access between landmark and transit.
Failure: ambiguous geocoder result or several same-name places.
Recovery: show disambiguation choices with locality context. Never silently choose a formal terminal merely because it is nearby.

## F3 Rider needs to know where to board
Trigger: route selected.
System: resolve the boarding event from the chosen Pattern and its boarding policy.
Output: stand/terminal name and location when formal; otherwise an evidence-backed corridor boarding instruction with explicit uncertainty/safety wording.
Failure: only approximate area known, policy unknown, or source stale.
Recovery: show “boarding point not precisely verified” and enough local context to avoid false precision. Do not synthesize a roadside point from prose or straight-line geometry.

## F4 Direct fixed service
Examples: Water Taxi POS to San Fernando; a verified direct PTSC pattern.
System: one boarding, one ridden Leg even if graph representation contains multiple internal Segments.
Output: no transfer count, one fare context, bounded leg geometry, correct direction.

## F5 One or more transfers
Trigger: no valid direct itinerary or alternative is desirable.
System: only explicit Transfer Links/Interchanges may connect internal transit legs. Transfer count is enforced during search. Walking duration comes from verified/surveyed linkage or a clearly qualified walking estimate.
Output: “Get off at X; walk Y; board Z” with separate walking leg.
Failure: nodes are close but no interchange evidence; required connection impossible; transfer would occur after service closes.
Recovery: reject that itinerary and continue search. Proximity is evidence to investigate, not permission to route.

## F6 Multi-mode journey
Modes may include PTSC + maxi, PTSC + marine, maxi + route taxi, etc.
System: mode preference means the itinerary must include the requested mode unless product copy explicitly says “only this mode”; connector modes remain allowed where needed.
Output: every mode change is explicit and leg boundaries align with actual board/alight events.

## F7 Schedule-sensitive trip
Inputs: departure timestamp in America/Port_of_Spain.
System: service-day and schedule eligibility are evaluated at the actual time each leg is boarded, including midnight rollover and transfer delay.
Output: published departure when available; otherwise a range/frequency statement or “times unavailable.”
Failure: missed last sailing/bus, holiday exception, stale schedule.
Recovery: next valid itinerary or clear no-supported-service result. Never substitute a generic wait estimate while displaying it as a timetable.

## F8 Fare-sensitive trip
System: apply Fare Rules across the boarded Leg, not each internal graph edge. A shorter sub-leg must not exceed a known full-route bound unless the fare rule itself documents that result.
Output: exact TT$ amount when official/current and applicable; range/estimate otherwise; no fake cents/precision.

## F9 Multiple valid route options
System: generate alternatives during search, not by taking one static path and post-hoc decorating it. Preserve materially different service sequences/modes.
Output: best-supported practical option first, plus reasonable alternatives. Ranking may consider time, transfers, access burden, evidence quality, and user preference.
Failure: alternatives differ only by duplicate record IDs for the same rider service.
Recovery: collapse semantic duplicates before presentation.

## F10 Change origin/destination or mode
Trigger: rider swaps endpoints, edits either field, or changes a mode tab.
System: invalidate route-query state only; never mutate canonical network data. Re-plan using preserved resolved endpoint context where still valid.
Output: new itinerary with no stale geometry, fare, or route card.

## F11 Current location
Trigger: rider grants geolocation.
System: retain accuracy metadata; current position is a Place-like query endpoint, not a durable Stop.
Output: visible accuracy warning when needed; map marker; same routing/access rules as other places.
Failure: permission denied/low accuracy.
Recovery: manual search without degradation.

## F12 Incomplete data
Trigger: router lacks evidence for part/all of trip.
Output: explicit data-gap state. Examples: “We do not have a verified connection from X to Y yet” or “service times are unavailable.”
The system must not convert absence into a negative claim and must not bridge the gap with an invented transit service.

## F13 Wrong suggested boarding point
Trigger: rider/contributor finds a correction.
Recovery: provide evidence/correction path. The current field-review workflow exports a review payload and correctly does not directly mutate public data.

## F14 Contributor / association review
Inputs: selected existing route/pattern, correctness, ordered known points, fare, boarding/alighting policy, operation, reviewer/source.
System: build an evidence submission; resolve points conservatively; mark ambiguity; generate a proposed change set; require independent promotion review.
Output: auditable proposal with provenance.
Failure: ambiguous endpoint, duplicate points, conflicting verified evidence.
Recovery: hold for mapping/review, never auto-promote over stronger evidence.

## F15 Maintainer promotion
System: normalize raw evidence into claims; compare against canonical entities; do not downgrade stronger truth; run schema, semantic, routing, golden-journey, and data-quality gates; require reviewer distinct from builder for material changes.
Output: versioned network snapshot and migration/promotion report.


## Real-world scenario review

### “I am in Port of Spain and want to reach X.”
UX requirement: origin may be a locality/current position rather than City Gate. Resolve the rider’s actual location first, then explain which terminal/stand to reach. Do not silently replace “Port of Spain” with one transport node.

### “I know the destination but not which stand serves it.”
UX requirement: search/index must bridge Place -> suitable Access Point/Pattern and show the boarding stand in rider language. Formal terminal names should be suggestions, not hidden exact-match-only knowledge.

### “I need two different vehicles.”
UX requirement: every board/alight/transfer is explicit. The route score must account for transfer burden and operating compatibility. A walk between stands needs a real Transfer Link.

### “I do not know the formal stop name.”
UX requirement: normal landmark/neighbourhood search is first-class. Formal stop vocabulary is an implementation detail until the route explanation.

### “The app’s data is incomplete.”
UX requirement: show what is known and where evidence stops. “No verified route in our current data” is the default uncertainty state; do not claim service nonexistence.

### “The service stops running before I get there.”
UX requirement: route legality uses the time of boarding that leg, not the trip’s initial date. Reject the itinerary or offer the next evidence-backed option.

### “The route involves walking between two stands.”
UX requirement: show the walk as a separate leg, distance/time confidence, destination stand name, and map segment. Never infer the interchange solely from distance.

### “I am using one hand on a phone outside.”
UX requirement: large controls, concise primary copy, visible next action, low text density, no horizontal overflow, map/result state that does not require tiny hit targets, and evidence detail behind expansion.

### “I do not understand Trinidad transit terminology.”
UX requirement: preserve local terms because they carry real meaning, but pair them with action copy: e.g. “Green Band maxi — board at …” rather than presenting unexplained internal labels.

### “The suggested boarding point is wrong.”
UX requirement: the app must not fight the rider with false precision. Surface location confidence and provide a correction/evidence path. Critical field corrections go through reviewed promotion.

### “I change my destination halfway through planning.”
UX requirement: invalidate query/result state and re-plan cleanly. Canonical network data and previous query-local virtual access state must remain untouched.

### Product implication
A technically connected path is not enough. A valid Transit Trinidad itinerary must be operationally plausible, explainable to the rider, evidence-aware, and recover safely when truth is incomplete.
