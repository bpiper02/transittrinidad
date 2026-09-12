# Corridor service-pattern sprint — Part 1

## Decision

Transit Trinidad models informal transit as **directional service patterns over ordered corridors**, not only terminal-to-terminal OD pairs.

A single local service can legitimately produce multiple rider trips when the rider's board and alight points are ordered points on the same service pattern.

Example candidate pattern:

`Chaguanas → Chase Village → Couva → California → Claxton Bay → San Fernando`

If this pattern is supported, California → Claxton Bay is a valid use of the same service. It does **not** require a separate California–Claxton Bay route record.

## Evidence for the model

- Trinidad Guardian reporting on the 2015 Route 3 maxi protest states that green-band maxi users commonly got off in communities along the Southern Main Road between Chaguanas and San Fernando, and Claxton Bay commuters were directly affected when the maxis stopped running.
- Newsday reporting in 2022 quotes a Chaguanas-to-San Fernando maxi driver during a Southern Main Road protest in Claxton Bay, corroborating that this is an actual operating corridor rather than a purely terminal-to-terminal abstraction.
- MOWT traffic-control orders describe route-area maxi operations and route-specific stand behavior, reinforcing that route-area/service-pattern and stand rules are separate concepts.
- Local reviewer knowledge further corroborates that some Chaguanas–San Fernando maxis operate via the main road and can serve intermediate communities, while other patterns may use faster highway alignments.

## Pattern fields proposed for later integration

- `patternType`: `local | limited | express`
- ordered `stopNodeIds` / served corridor points
- `boardingPolicy`: `fixed_only | corridor_hail | corridor_request | mixed`
- `alightingPolicy`: same vocabulary
- optional `boardableNodeIds`
- optional `alightableNodeIds`
- direction remains explicit; reverse is never inferred
- eventual per-segment confidence and geometry are separate from service-existence confidence

No canonical service data is mutated in Part 1.

## Routing rule

A rider may use a service from point A to point B only when:

1. A and B are both represented on the same directional pattern;
2. A occurs before B in the ordered pattern;
3. boarding is allowed at A;
4. alighting is allowed at B;
5. the service is not held as `needs_review`;
6. local/limited/express behavior is respected.

Unknown fare, schedule, or exact road geometry does not invalidate an otherwise supported corridor trip.

## What we explicitly do NOT infer

- A settlement merely because it lies geographically between the endpoints.
- A stop from a same-colour maxi route area alone.
- A local stop on an express/highway pattern.
- Reverse service from the forward service.
- A road segment that is not part of the actual operating pattern.
- Every possible roadside point as a canonical node; later work should use a controlled set of served places/zones plus corridor geometry.

## QA buffer 1

Synthetic local pattern:

`Chaguanas → Chase Village → Couva → California → Claxton Bay → San Fernando`

Expected:

- California → Claxton Bay: PASS
- Couva → San Fernando: PASS
- Claxton Bay → California on the same southbound pattern: FAIL
- Chaguanas → Gasparillo when Gasparillo is absent from the pattern: FAIL
- six ordered served points produce 15 possible forward OD pairs

Synthetic express pattern:

`Chaguanas → San Fernando`

Expected:

- Chaguanas → San Fernando: PASS
- California → San Fernando: FAIL

Synthetic limited pattern:

Explicit boarding/alighting restrictions must override mere inclusion on the corridor.

## Part 1 conclusion

The existing router already has a useful foundation: `stopNodeIds` are ordered and the graph builds edges between consecutive points. The architecture does **not** need a rewrite from scratch. The major later change is to enrich canonical services with real intermediate corridor points and pickup/alighting policy, then teach presentation and QA to distinguish local, limited and express patterns.

This is intentionally a logic contract only. Parts 2–5 will research actual corridor patterns, promote them into canonical data, integrate routing behavior, expand inferred coverage conservatively, and update rider instructions.
