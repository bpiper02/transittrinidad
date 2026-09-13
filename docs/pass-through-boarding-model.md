# Pass-through boarding model

This model exists because Trinidad routing cannot be treated as terminal-to-terminal only. A rider may be close to a major road where a maxi or route taxi passes, but the app must not tell people to stand anywhere on a highway or invent a stop.

## Product distinction

Transit Trinidad should separate four things that currently get blurred together:

1. **Verified stop or stand** — a terminal, stand, station, ferry terminal, water taxi terminal, or named stop with evidence.
2. **Estimated main-road boarding area** — a route segment where vehicles are believed to pick up/drop off along the road, but the exact safe waiting point is approximate.
3. **Short local access leg** — a small non-transit access movement that gets the rider from their current place to the main-road boarding area.
4. **Unknown / do not assume** — a route may pass near the rider, but we do not yet know that boarding there is safe or normal.

The app should only create an estimated main-road boarding area when the service and segment allow it.

## Policies

Service-level and segment-level policies use the same vocabulary:

- `fixed_stop_only`: board/alight only at known stops.
- `terminal_or_stand_only`: board/alight only at formal terminals, stands, or stations.
- `main_road_pass_through`: boarding/alighting can happen along a known main-road segment if there is safe stopping evidence.
- `hail_along_segment`: explicitly flagged hail-and-ride / continuous-stop behavior.
- `unknown_do_not_assume`: default state. The router must not create virtual roadside access.

For informal modes, do **not** default to pass-through just because the mode is `maxi` or `route_taxi`. That will make the map feel smart for two minutes and then destroy trust when it sends someone to a bad shoulder, flyover, or wrong side of the road.

## Segment fields

A future service can add `accessSegments`:

```json
{
  "id": "east-main-road-san-juan-to-pos-pass-through",
  "fromNodeId": "san-juan",
  "toNodeId": "port-of-spain",
  "roadClass": "main_road",
  "boardingPolicy": "main_road_pass_through",
  "alightingPolicy": "main_road_pass_through",
  "confidence": "community_verified",
  "safetyEvidence": ["junction", "community_verified"],
  "sources": [
    {"name":"field review","url":"https://example.com","checkedAt":"2026-09-13"}
  ]
}
```

Required claims:

- The segment endpoints must appear in the service `stopNodeIds` in the same order as the service pattern.
- A virtual access segment needs non-unknown confidence.
- A virtual access segment needs real safe stopping evidence, not only `unknown`.
- Boarding and alighting policies are separate. A route may allow boarding in one area but only fixed alighting elsewhere.

## Routing behavior

When normal stop-to-stop routing fails, the router may later try:

```txt
origin
→ walk or short local access
→ estimated main-road boarding area
→ verified service movement along a known pattern
→ estimated main-road drop-off area or verified stop
→ walk/local egress
→ destination
```

But that fallback should only run after the stop graph fails. Verified stands/terminals should still beat approximate roadside access.

## Safety rules

Reject pass-through access when:

- the service policy is `unknown_do_not_assume`, `fixed_stop_only`, or `terminal_or_stand_only`;
- the segment has no safe stopping evidence;
- the segment is highway/expressway-like and has no named stop, stand, junction, lay-by, wide shoulder, association confirmation, or community verification;
- the access leg is beyond the short-local threshold;
- the candidate requires first moving materially away from the destination without a strong intermodal reason.

Public language should avoid overclaiming. Use:

- “Estimated main-road boarding area”
- “Use a visible, legal, well-lit place to wait”
- “Prefer a stand, marked stop, junction, lay-by, or locally known pickup point”

Do not use:

- “Stop exactly here”
- “Guaranteed pickup here”
- “Stand on the highway shoulder”

## Inspiration translated into our product

- GTFS Continuous Stops: model pickup/drop-off as a segment-level policy, not a fake stop at every point.
- GTFS-Flex / OpenTripPlanner Flex: separate fixed-route travel from flexible access and egress.
- TfL Hail & Ride: even when hail access exists, safety and stop certainty matter.
- Digital Matatus / Transport for Cairo / Trufi: informal systems become useful when uncertainty is encoded instead of hidden.

## Next implementation step

After this contract lands, the next routing sprint should add a candidate generator that projects the rider to an eligible `accessSegment`, creates a virtual boarding/drop-off point, and labels the first/last leg as `walk` or `short_local_access`. Start with one fixture route first, then promote real Trinidad corridors only after evidence review.
