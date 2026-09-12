# Part 2 — Sprint 1: Central–South corridor reconstruction

## Goal

Reconstruct Chaguanas ↔ San Fernando informal transit as directional service patterns rather than isolated OD pairs. Do not mutate canonical routing until the pattern logic survives the evidence and business-logic checks below.

## Evidence synthesis

### Strong evidence for a Southern Main Road local pattern

1. Trinidad Guardian (2015), during a Route 3 Green Band service protest, reported that people using green-band maxis normally **drop out in communities along the Southern Main Road between Chaguanas and San Fernando**. Claxton Bay commuters were specifically affected.
2. Newsday (2022) interviewed a **Chaguanas to San Fernando maxi-taxi driver** during a Claxton Bay Southern Main Road protest. Newsday also reported from the San Fernando to Chaguanas maxi stand and quoted a driver describing road conditions from California toward St Margaret's.
3. Southern Main Road geography independently establishes the ordered road corridor through Chaguanas / Chase Village / Couva / California / Claxton Bay / Marabella / San Fernando, with intermediate local communities along that road.
4. Local reviewer knowledge corroborates that some Chaguanas → San Fernando maxis run the main-road pattern and riders hail/get off along the route; California → Claxton Bay is a representative derived trip.

### Separate highway pattern

The Sir Solomon Hochoy Highway provides a distinct Chaguanas → San Fernando path via highway interchanges. A vehicle using this pattern must not automatically inherit Southern Main Road local pickup points. The highway passes/accesses Chase Village, Freeport, Couva, Claxton Bay and Gasparillo via interchanges, but geographic proximity/interchange access is not evidence that a particular maxi boards or alights there.

## Proposed service patterns

### A. Chaguanas → San Fernando — Southern Main Road local

Pattern type: `local`
Pickup policy: `corridor_hail`
Drop policy: `corridor_request`
Status: `reported_pattern` pending canonical promotion

Ordered anchor sequence for current QA model:

1. Chaguanas
2. Chase Village
3. Couva
4. California
5. Claxton Bay
6. Marabella
7. San Fernando

Potentially useful additional anchors to research before promotion:
- Freeport / St Mary's / Carapichaima corridor relationship
- Point Lisas / McBean relationship to the through pattern
- St Margaret's
- Pointe-a-Pierre
- Vistabella

Important: additional anchors are **not** auto-added merely because they are on/near the road. Each needs evidence that this specific maxi pattern can practically serve it.

Derived journeys that should become valid once the pattern is promoted include, directionally:
- Chaguanas → Couva
- Chaguanas → California
- Chase Village → Couva
- Chase Village → California
- Couva → California
- Couva → Claxton Bay
- California → Claxton Bay
- California → Marabella
- California → San Fernando
- Claxton Bay → Marabella
- Claxton Bay → San Fernando
- Marabella → San Fernando

These are not separate route records; they are sub-journeys of one ordered service pattern.

### B. Chaguanas → San Fernando — highway/express

Pattern type: `express` or `limited` depending on future evidence
Pickup policy: `fixed_only` until proven otherwise
Status: `research_lead`

Known road corridor:
Chaguanas → Sir Solomon Hochoy Highway → San Fernando area

Do **not** derive California → Claxton Bay, Couva → California, or similar local trips from this pattern without explicit boarding/alighting evidence.

## Direction rule

No reverse is synthesized. San Fernando → Chaguanas must be separately supported, even if it likely uses a similar corridor. Existing reporting from the San Fernando → Chaguanas maxi stand is useful evidence of reverse service existence, but intermediate boarding/alighting behavior must still be modeled directionally.

## Business-logic checks

The following must remain true throughout the sprint:

1. **Road-path evidence is not boarding evidence.** A settlement can lie on a road without being usable as a pickup point for a specific service.
2. **Local and express patterns are separate services.** Same endpoints do not imply same intermediate coverage.
3. **Direction matters.** Southbound evidence never auto-creates northbound coverage.
4. **One pattern can cover many trips.** Intermediate OD pairs are derived at routing time, not duplicated in canonical data.
5. **Hail/drop behavior is mode-pattern specific.** Corridor pickup is allowed only when supported for that pattern.
6. **Confidence is fact-level.** Service existence, path, intermediate serviceability, fare, hours and exact boarding location can carry different confidence.
7. **No straight-line inference.** Only ordered points on a supported road/service pattern may generate sub-journeys.
8. **No interchange assumption.** Highway access to a community does not mean a through maxi stops there.

## Sprint 1 conclusion

The evidence is strong enough to treat a Chaguanas ↔ San Fernando Southern Main Road local maxi as a real service-pattern concept and to continue researching its exact ordered intermediate anchors. The highway variant must remain separate. Canonical mutation waits until anchor confidence is resolved enough to avoid encoding dumb local-stop assumptions.
