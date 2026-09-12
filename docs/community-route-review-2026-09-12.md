# Community route review — 2026-09-12

## Purpose

Transit Trinidad should not require government-grade documentation for informal transport to be useful. The network now treats route claims at the fact level rather than treating an entire service as simply verified/unverified.

### Routing policy

- **Confirmed** — official/operator evidence, strong mapped evidence, or multiple strong independent sources. Routable.
- **Locally reported** — credible evidence that the service is used in practice, but one or more details remain unresolved. Routable with a `Reported route` label and ranking penalty.
- **Research lead** — weak inference, historical-only evidence, same-colour-band inference, or ambiguous endpoints. Not routable until strengthened.

A service can therefore have, for example, confirmed existence but reported boarding location, unknown fare, unknown operating window, and endpoint-only geometry.

## What keeps a route out of routing

1. Reverse direction exists only by inference from the opposite direction.
2. The only rationale is that both places fall inside the same Maxi route colour/area.
3. Evidence establishes transport in the area but not the specific origin/destination pair.
4. Evidence is clearly historical and current operation cannot be established.
5. Sources materially conflict about whether the service still operates.
6. Endpoint ambiguity is high enough that the app could send a rider to the wrong town/stand.

Unknown fare, timetable, exact path, or exact bay **does not by itself exclude a service**.

## Batch A — local review outcomes

| Corridor | Mode | Local review outcome | Remaining uncertainty |
|---|---|---|---|
| Chaguanas ↔ Couva | Route taxi | **Locally confirmed as a normal taxi connection from memory.** Keep routable as locally reported. | Exact stands, fare, and current operation window. |
| Chaguanas ↔ California | Route taxi | **Locally confirmed as a normal taxi connection from memory.** Keep routable as locally reported. | Exact California pickup/terminus, fare, operation window. |
| Chaguanas → San Fernando trunk via California/Chase Village | Maxi | **Locally corroborated:** Chaguanas/San Fernando maxis run through these main-road communities, so California/Chase Village can function as corridor pickup/drop areas rather than requiring separate terminal claims. | Exact legal/association pickup rules and current fare segmentation. |
| Chaguanas ↔ Chase Village | Route taxi | Local reviewer says this looks/seems correct, but did not claim strong personal certainty. Keep as locally reported. | Exact stand/pickup and reverse details. |
| Rio Claro ↔ Princes Town | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Exact stands, fare, operation window. |
| Rio Claro ↔ Guayaguayare | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Exact stands, fare, reverse details. |
| Rio Claro ↔ Libertville | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Whether Libertville is a terminus or roadside pickup. |
| Rio Claro ↔ Poole | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Whether Poole is a terminus or roadside pickup. |
| Mayaro ↔ Guayaguayare | Maxi | Local reviewer says this looks/seems correct. Existing official historical hub evidence also supports the corridor. | Current lane/operation/reverse confirmation. |
| Mayaro ↔ Guayaguayare | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Separate current taxi operation vs maxi, exact stands. |
| Port of Spain ↔ Chaguaramas | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Chaguaramas-side terminal/pickup and reverse details. |
| Port of Spain ↔ San Juan | Route taxi | Local reviewer says this looks/seems correct. Keep as locally reported. | Exact return stand and fare. |
| San Fernando ↔ Curepe | Route taxi | Local reviewer says this looks/seems correct, but this remains the least certain because it is an unusually long direct shared-taxi corridor. Keep as locally reported until strengthened. | Direct-vs-transfer behavior, exact stands, current operation. |

### Reviewer basis

Local reviewer is Trinidadian and familiar with the network; explicit memory was strongest for Chaguanas↔Couva and Chaguanas↔California. Other Batch A routes were endorsed as seeming correct, which is useful corroboration but is intentionally recorded at lower certainty than a personally used/regularly observed route.

## Batch B — next local sanity-check targets

These should be reviewed next because they remain weak on service/direction/stand detail and are high-value for network usefulness:

1. San Fernando ↔ Princes Town — route taxi / maxi distinction, both directions, exact stands.
2. San Fernando ↔ Penal — direct route taxi? exact stand at each end? both directions?
3. Penal ↔ Siparia — direct route taxi? both directions? main-road pickup vs stand?
4. San Fernando ↔ Point Fortin — maxi vs route taxi options, exact stands, both directions.
5. San Fernando ↔ La Brea — direct route taxi/maxi? both directions? exact boarding.
6. Couva ↔ San Fernando — direct taxi/maxi? or normally via Chaguanas? exact pickup pattern.
7. Couva ↔ California — dedicated taxi route or simply through-service on the Southern Main Road?
8. Chaguanas ↔ San Fernando — direct maxi is locally corroborated; is there also a normal direct route-taxi service?
9. San Fernando ↔ C3 / Gulf City — what is the normal public-transport pattern: taxi, maxi, roadside pickup, or transfer?
10. Arima ↔ Sangre Grande — maxi/taxi both? both directions? where in each town?
11. Arima ↔ Valencia — direct route taxi/maxi? both directions? main-road pickup or stand?
12. Sangre Grande ↔ Toco — maxi/taxi current service? both directions? Brierley Street for outbound?
13. Sangre Grande ↔ Mayaro — maxi/taxi current service? both directions? direct today?
14. Scarborough ↔ Crown Point — route taxi current? exact Scarborough stand and Crown Point pickup?
15. Scarborough ↔ Buccoo — route taxi separate from PTSC? both directions?

## Suggested community confirmation format

A local reviewer can answer compactly:

```text
Route: Chaguanas ↔ Couva
Exists: yes / no / unsure
Mode: route taxi / maxi / PTSC / other
Direction: both / A→B only / B→A only / unsure
A-side boarding: [landmark, street, stand, or “main road”]
B-side boarding: [landmark, street, stand, or “main road”]
Typical fare: [TT$ or unknown]
Typical hours: [rough range or unknown]
Notes: [changes, short turns, weekends, etc.]
Reviewer basis: personally used / regularly observed / family/friend uses / other
Last known: [month/year or rough period]
```

Community confirmation should be stored as community/local evidence, never relabeled as an official source.
