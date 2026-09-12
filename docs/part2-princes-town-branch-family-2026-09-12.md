# Part 2 — Princes Town branch family: Moruga / St Mary's / New Grant / Sixth Company

## Scope
Reconstruct the Princes Town Route 4 branch family without collapsing several distinct services into one fake all-stop corridor.

## Strong evidence

### 1. Official 2017 operating groups
Legal Notice No. 51 of 2017 separates Route Area 4 maxi-taxis in Princes Town into two groups:

Group A:
- Princes Town → Rio Claro
- Princes Town → Moruga
- Princes Town → St. Mary's

Group B:
- Princes Town → Tableland
- Princes Town → New Grant
- Princes Town → Sixth Company

This is important operating evidence. Services within a group may share stand geography, but the grouping does not prove identical stop sequences or through-service between destinations.

Source: Traffic Control (Experimental Scheme) (Princes Town Maxi-Taxi) Regulations, 2017.

### 2. Fare evidence confirms current destination markets
A 2022 Route Four Blackband Association fare release separately lists Princes Town fares to:
- Moruga
- Tableland
- New Grant
- St. Mary's
and also a generic short-drop fare.

This supports distinct active destination services plus local/short-drop behavior within at least part of the Route 4 network.

Source: Trinidad and Tobago Newsday, 2022-10-14.

### 3. Princes Town → Sixth Company is independently documented
A 2018 Newsday report describes the Princes Town–Sixth Company taxi route as a 15-minute journey with an explicit fare.

This is strong direct evidence for a dedicated Sixth Company service rather than a place that should only be reached through a generic New Grant route.

Source: Trinidad and Tobago Newsday, 2018-01-08.

### 4. Princes Town → Hindustan / New Grant is independently documented
A 2003 Newsday report identifies drivers on the Princes Town–Hindustan taxi route and explicitly discusses short-drop fares. The report also references New Grant School near Nageer Junction.

A 2024 traveller report independently observed a maxi heading from Princes Town to New Grant.

These together support a real Princes Town → Hindustan/New Grant local service with intermediate use, while exact modern roadside stop nodes still need map-level promotion.

Sources:
- Trinidad and Tobago Newsday, 2003-11-11.
- Traveler Jack, 2024.

### 5. Moruga-side road geography and service context
Modern regulatory/fare evidence confirms Princes Town → Moruga as a named Route 4 service.

Road/community context places Indian Walk, Fifth Company, St Mary's / Preau and other Moruga-district communities south of Princes Town. This is useful supporting geography only.

Do not promote Indian Walk, Fifth Company, St Mary's or other communities as guaranteed stops on every Moruga maxi solely because they lie along the broader corridor.

### 6. St Mary's must remain a distinct named service
The 2017 legal notice and 2022 fare release both name St Mary's separately from Moruga. Therefore the safe model is a distinct Princes Town → St Mary's pattern unless later evidence proves that St Mary's is merely a guaranteed intermediate stop on a specific Moruga service.

## Working pattern family

### Pattern A — Princes Town → Moruga
Status: confirmed destination service.
Pattern type: local/Route 4 branch.
Intermediate stop chain: not yet canonical.

Candidate corridor communities for later verification include Indian Walk, Fifth Company and Moruga-district settlements, but none should be auto-promoted from geography alone.

### Pattern B — Princes Town → St Mary's
Status: confirmed named destination service.
Pattern type: local branch.
Do not merge into the Moruga pattern yet.

### Pattern C — Princes Town → New Grant / Hindustan
Status: confirmed local service.
Pattern type: local.
Short-drop behavior: supported.

This pattern is a strong candidate for later intermediate-trip derivation once exact boardable roadside anchors are mapped.

### Pattern D — Princes Town → Sixth Company
Status: confirmed dedicated taxi route.
Pattern type: local.
Do not assume Sixth Company is merely an intermediate New Grant stop.

### Pattern E — Princes Town → Tableland
Status: confirmed destination service from prior sprint.
Keep distinct from New Grant and Sixth Company despite shared operating group.

## Logic QA

PASS: Princes Town → Moruga is a real service.
PASS: Princes Town → St Mary's is a separately named real service.
PASS: Princes Town → New Grant/Hindustan is a real local service.
PASS: Princes Town → Sixth Company is a real dedicated route.
PASS: Tableland / New Grant / Sixth Company belong to one operating group but remain separate service patterns.

FAIL: Infer New Grant → Sixth Company as a one-seat trip merely because both leave from the same Princes Town operating group.
FAIL: Infer St Mary's → Moruga as a one-seat trip merely because both are in the same official group.
FAIL: Treat every Moruga Road community as boardable on every Moruga-bound maxi.
FAIL: Use Route 4 colour/route-area membership as proof of shared through-service.

## Product implication
The Princes Town network is a branch fan, not a linear route. The router should represent multiple directional patterns radiating from Princes Town and only derive intermediate journeys inside an individual pattern when that pattern's ordered serviceable points are supported.

## Promotion candidates from this chunk
1. Princes Town → New Grant/Hindustan: strongest local/intermediate-use candidate.
2. Princes Town → Sixth Company: safe as a distinct endpoint route; intermediate nodes still pending.
3. Princes Town → Moruga: safe as endpoint route; intermediate chain pending.
4. Princes Town → St Mary's: safe as endpoint route; keep distinct until overlap with Moruga is proven.
5. Princes Town → Tableland: retain as separate endpoint route from prior work.

## Sources
- Government of Trinidad and Tobago, Legal Notice No. 51 of 2017.
- Government of Trinidad and Tobago, Legal Notice No. 73 of 2009 / No. 151 of 2009 historical stand evidence.
- Trinidad and Tobago Newsday, 2022-10-14, Route Four fare changes.
- Trinidad and Tobago Newsday, 2018-01-08, Sixth Company route.
- Trinidad and Tobago Newsday archive, 2003-11-11, Hindustan taxi fare protest.
- Traveler Jack, 2024, Princes Town → New Grant maxi observation.

No canonical routing data is mutated in this research chunk.
