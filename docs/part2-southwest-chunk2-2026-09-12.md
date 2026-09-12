# Part 2 — Southwest Chunk 2 (2026-09-12)

Scope: Penal, Siparia, Point Fortin, La Brea and their links to San Fernando. This chunk is intentionally research/logic only; it does not mutate canonical routing.

## Evidence-backed service structure

### 1. Penal ↔ Siparia route taxi
- A dedicated Siparia/Penal taxi association and route are documented.
- 2015 reporting explicitly says passengers paid from Siparia to Penal and vice versa, with separate short-drop fares.
- Penal-side stand was reported at the junction of Penal Rock Road.
- This supports a true local corridor with intermediate short-drop behavior, but this chunk does not yet invent named intermediate served places without stronger stop/road evidence.

### 2. San Fernando ↔ Penal route taxi
- 2022 reporting identifies a San Fernando-to-Penal taxi stand.
- A 2025 police report describes a driver actively working the San Fernando-Penal route and reaching the Penal taxi stand, confirming the route remained operational much later than older fare evidence.
- The same 2025 report shows off-route drop behavior: a passenger requested Sunrees Road and paid an extra fare. This is useful business logic evidence: the canonical route and off-route deviations must remain distinct.

### 3. San Fernando ↔ Point Fortin route taxi
- Strong current-ish route evidence exists from the Point Fortin/San Fernando Taxi Drivers' Association.
- In 2023 the normal fare remained TT$20.
- The route now has two practical variants after highway expansion:
  - highway/direct variant
  - main-road/accommodation variant serving Guapo and other communities
- Association leadership explicitly said some drivers use the highway only while others continue accommodating Guapo passengers.
- Therefore Point Fortin↔San Fernando cannot be represented as one universal stop list.

### 4. San Fernando ↔ La Brea route taxi
- A dedicated La Brea/San Fernando Taxi Drivers Association is documented.
- 2023 fare evidence: TT$15 La Brea→San Fernando.
- La Brea historically sat on the main Point Fortin↔San Fernando road flow, but the new highway lets many Point Fortin vehicles bypass it.
- This means La Brea must remain its own confirmed service; it must not be inferred as a stop on every Point Fortin service.

### 5. Point Fortin / La Brea local trunk behavior
- 2018 and 2022 reporting repeatedly describe Point Fortin, La Brea, Guapo, Vessigny, Rousillac, South Oropouche and San Fernando as connected by the old/main-road southwest transport corridor.
- 2022 protest reporting describes separate relay legs:
  - Point Fortin drivers → La Brea
  - La Brea drivers → Oropouche / San Fernando
- This is evidence of a connected regional trunk, but also evidence that driver associations/routes may be segmented rather than one through-service.

## Proposed pattern families

### A. San Fernando → Penal local taxi
Pattern class: local
Pickup/alight: corridor/local, with off-route deviations explicitly excluded from canonical path
Confidence: confirmed service, intermediate ordering pending next map/evidence pass

### B. Penal → Siparia local taxi
Pattern class: local
Pickup/alight: short-drop/local corridor behavior supported
Confidence: confirmed service, named intermediate served points pending stronger evidence

### C. San Fernando → Point Fortin highway/direct
Pattern class: limited
Pickup/alight: do not inherit old-main-road communities
Confidence: confirmed service + current route behavior

### D. San Fernando → Point Fortin old/main-road accommodation
Pattern class: local/limited hybrid candidate
Likely corridor communities include South Oropouche / Rousillac / Vessigny / La Brea / Guapo before Point Fortin, but this exact ordered served-point list is NOT yet promoted because current evidence shows some vehicles accommodate those places rather than proving every vehicle follows the same stop policy.

### E. San Fernando → La Brea
Pattern class: local
Confidence: confirmed dedicated route

## Logic checks

PASS: Penal → Siparia is a valid dedicated service.
PASS: San Fernando → Penal is a valid dedicated service.
PASS: San Fernando → Point Fortin exists as a direct route.
PASS: San Fernando → La Brea exists as a dedicated route.
PASS: Point Fortin services can have highway and main-road variants.
FAIL: Infer La Brea as a stop on every San Fernando→Point Fortin service.
FAIL: Infer Guapo as a stop on every highway service.
FAIL: Treat off-route requested drops such as Sunrees Road as canonical corridor stops.
FAIL: Treat the southwest regional trunk as one continuous through-service merely because associations overlap geographically.

## Product implication

The southwest network should be modeled as a set of overlapping directed service patterns, not one brown-band line. A rider may sometimes complete an intermediate trip on a passing vehicle, but only when the specific pattern actually serves that corridor segment.

## Next research need

Before canonical mutation:
1. establish the exact San Fernando→Penal road alignment and named served communities;
2. establish Penal→Siparia intermediate places;
3. distinguish which Point Fortin vehicles use highway-only vs old/main-road accommodation;
4. determine whether La Brea is a guaranteed served point on any Point Fortin pattern or only on dedicated La Brea service / selected Point Fortin vehicles.
