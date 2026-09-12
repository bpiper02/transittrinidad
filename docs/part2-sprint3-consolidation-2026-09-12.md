# Part 2 — Sprint 3 consolidation: South / Southeast / Southwest

## Scope
Consolidate the Sprint 3 research chunks into one promotion plan before canonical routing mutation. This is a business-logic and evidence reconciliation pass.

## Core conclusion
South Trinidad is not one continuous Route 4 or brown-band line. It is a network of overlapping local corridors, destination-specific branches, and some newer express/highway variants. Intermediate trips should only be derived inside one supported ordered service pattern.

## Safe-to-promote service families

### 1. San Fernando → Princes Town local corridor
Status: strongest intermediate-trip candidate in Sprint 3.

Evidence supports a genuine Naparima/Mayaro Road local corridor with on-route village fares and separate off-route surcharges.

Working ordered anchors:
San Fernando → Palmyra/Seegobin area → Cleghorn → Mt Stewart → Iere → Princes Town

Pattern type: `local`
Boarding: `corridor_hail`
Alighting: `corridor_request`

Promotion condition: map these anchors onto correct road-aligned network nodes before enabling derived trips.

### 2. San Fernando ↔ Penal route taxi
Status: confirmed service existence; endpoint promotion safe where not already present.

A 2025 report confirms a driver actively working the San Fernando–Penal route and reaching the Penal taxi stand. Off-route requests such as Sunrees Road must not become canonical stops.

Pattern type: `local`
Intermediate chain: keep staged until exact road-aligned served communities are established.

### 3. Penal ↔ Siparia route taxi
Status: confirmed service family; endpoint route safe.

Short-drop fare evidence supports local stopping behavior, but does not identify every valid intermediate settlement.

Pattern type: `local`
Intermediate chain: staged.

### 4. San Fernando ↔ Point Fortin direct/highway
Status: confirmed and should be distinct from main-road service.

Post-2023 highway reporting shows some drivers use the highway/straight San Fernando pattern. Do not inherit La Brea, Guapo or old-road communities as stops.

Pattern type: `limited`
Boarding/alighting: fixed or explicit points until stronger stop evidence.

### 5. San Fernando ↔ Point Fortin main-road/accommodation variant
Status: supported service behavior, but exact stop sequence still needs promotion review.

Reporting explicitly distinguishes highway-only drivers from drivers who continue to accommodate Guapo passengers. This validates a separate pattern family.

Candidate geography for further verification:
San Fernando → South Oropouche/Rousillac corridor → Vessigny/La Brea area → Guapo → Point Fortin

Do not mark every listed community as guaranteed until boarding behavior is checked.

### 6. San Fernando ↔ La Brea
Status: confirmed dedicated service.

Keep independent of Point Fortin patterns because the highway now allows Point Fortin traffic to bypass La Brea.

### 7. Princes Town → Rio Claro
Status: confirmed direct branch; reverse independently corroborated.

Pattern type: destination-specific local/limited branch.
Intermediate chain: San Pedro/Naparima-Mayaro Road spine remains staged pending exact node mapping.

### 8. Princes Town → Tableland
Status: confirmed destination-specific Route 4 branch.

Do not continue this service to Rio Claro by inference.

### 9. Princes Town → New Grant / Hindustan
Status: confirmed destination-specific Route 4 branch.

Do not merge with Tableland or Rio Claro merely because the stands/roads overlap.

### 10. Rio Claro ↔ Mayaro
Status: confirmed distinct service.

Official Mayaro hub lane assignments and fare evidence support this leg.

### 11. Mayaro ↔ Guayaguayare
Status: confirmed distinct service.

Official Mayaro hub lane assignments and fare evidence support this leg.

### 12. Mayaro transfer relationship
Status: confirmed transfer relationship.

A valid journey may be:
Rio Claro → Mayaro → Guayaguayare

This is two services with a transfer, not a synthesized Rio Claro→Guayaguayare one-seat ride.

## Keep staged / do not promote yet

- Exact San Fernando→Penal intermediate stop chain.
- Exact Penal→Siparia intermediate stop chain.
- Guaranteed La Brea or Guapo service on every Point Fortin vehicle.
- New Grant→Rio Claro as one through-service.
- Tableland→Rio Claro as one through-service.
- New Grant→Tableland as one through-service.
- Rio Claro→Guayaguayare as one through-service.
- Sixth Company as a current branch without stronger current-operation evidence.
- Arbitrary settlements on Naparima-Mayaro Road merely because they are geographically between endpoints.
- Reverse patterns unless separately evidenced.

## Contradiction check

### Point Fortin / La Brea
No contradiction. Older regional-trunk evidence and newer highway evidence describe different service behaviors over time. The correct current model is multiple variants: dedicated La Brea service, Point Fortin highway/direct, and selected Point Fortin main-road/accommodation service.

### Princes Town branches
No contradiction. Fare schedules list many Route 4 destinations, while legal stand/grouping evidence separates branch families. Therefore destination membership does not imply shared ordered stop lists.

### Rio Claro / Mayaro / Guayaguayare
No contradiction. Separate hub lanes strongly support two named services meeting at Mayaro.

### Off-route drops
No contradiction. San Fernando→Princes Town and San Fernando→Penal reporting both show that drivers may accept paid deviations. These are flexible deviations from a canonical corridor, not new route stops.

## Promotion tiers

### Tier A — promote first
1. San Fernando→Princes Town local corridor, after exact anchor-node mapping.
2. Existing San Fernando↔Penal endpoint service metadata/behavior.
3. Existing Penal↔Siparia endpoint service metadata/behavior.
4. Separate Point Fortin highway/direct pattern from main-road/accommodation behavior.
5. Dedicated San Fernando↔La Brea service.
6. Princes Town↔Rio Claro branch.
7. Princes Town→Tableland branch.
8. Princes Town→New Grant branch.
9. Rio Claro↔Mayaro.
10. Mayaro↔Guayaguayare.
11. Explicit Mayaro transfer between the last two.

### Tier B — promote after one more local/map pass
- Intermediate San Fernando→Penal anchors.
- Intermediate Penal→Siparia anchors.
- Point Fortin main-road ordered anchors.
- Princes Town→Rio Claro intermediate anchors.
- Intermediate Rio Claro→Mayaro and Mayaro→Guayaguayare anchors.

## System rules locked by Sprint 3

1. Destination band/route-area membership never implies through-service.
2. Shared road or shared stand never implies identical stop sequence.
3. Highway and local-road variants are different service patterns.
4. Off-route paid diversions are not canonical stops.
5. Transfer chains are not converted into one-seat services.
6. Intermediate OD pairs are derived only from one ordered pattern with compatible boarding/alighting policy.
7. Reverse direction remains separately modeled.
8. Road geography alone is never enough to create a boardable stop.

## Recommended next implementation step
Do not mutate the whole south network at once. Start with one contained canonical promotion batch:

**Batch S1:** San Fernando→Princes Town local corridor + derived-trip tests.

Then run full repo tests and browser QA. If clean, promote the confirmed endpoint/branch families in smaller batches, preserving the same logic checks.
