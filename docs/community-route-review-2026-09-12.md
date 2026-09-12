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

## Batch A — routes needing local sanity check

These are currently among the weakest canonical corridors because they combine reported-service confidence with missing fares, endpoint-only geometry, approximate boarding, and/or an unconfirmed reverse direction. They are not automatically suspected of being fake.

| Corridor | Mode | Current concern | Local answer that would strengthen it |
|---|---|---|---|
| Chaguanas → Couva | Route taxi | Service reported; exact stands/return direction unresolved | Does this run directly today? Where do you board in Chaguanas and Couva? Does Couva → Chaguanas also run? |
| Chaguanas → California | Route taxi | Service reported; boarding point/reverse unresolved | Direct taxi? Where in Chaguanas? Main road or dedicated stand in California? Reverse? |
| Chaguanas → Chase Village | Route taxi | Service reported; boarding point/reverse unresolved | Direct taxi? Exact Chaguanas side and Chase Village pickup? Reverse? |
| Rio Claro → Princes Town | Route taxi | Service reported; weak current operating detail | Direct today? Where are the two stands? Reverse? |
| Rio Claro → Guayaguayare | Route taxi | Service reported; fare/stand/reverse incomplete | Direct taxi? Current boarding points? Reverse? |
| Rio Claro → Libertville | Route taxi | Service reported; endpoint/boarding detail incomplete | Direct taxi? Is Libertville a terminus or roadside pickup? Reverse? |
| Rio Claro → Poole | Route taxi | Service reported; endpoint/boarding detail incomplete | Direct taxi? Is Poole a terminus or roadside pickup? Reverse? |
| Mayaro → Guayaguayare | Maxi | Mayaro hub evidence exists; exact current operation/reverse incomplete | Does the maxi still run direct? Is Lane 5/current hub correct? Reverse from Guayaguayare? |
| Mayaro → Guayaguayare | Route taxi | Reported service; exact current stand/reverse incomplete | Separate route taxi service from the maxi? Where board at each end? |
| Port of Spain → Chaguaramas | Route taxi | Reported service; destination-side stand/reverse incomplete | Direct route taxi today? Where exactly in Chaguaramas does it terminate/pick up? Reverse? |
| Port of Spain → San Juan | Route taxi | Reported service; boarding/return details incomplete | Direct route taxi? POS stand and San Juan return stand? |
| San Fernando → Curepe | Route taxi | Reported service; unusually long corridor so needs local confirmation | Is this a genuine direct shared-taxi route, or does normal travel require a change? Where does it board? |

## Batch B — direction questions that should not be auto-filled

A reverse direction is promoted only when independently supported or locally confirmed. Do not assume symmetry.

Priority questions:

- Couva → Chaguanas
- California → Chaguanas
- Chase Village → Chaguanas
- Princes Town → Rio Claro
- Guayaguayare → Rio Claro
- Libertville → Rio Claro
- Poole → Rio Claro
- Guayaguayare → Mayaro (Maxi)
- Guayaguayare → Mayaro (route taxi)
- Chaguaramas → Port of Spain
- San Juan → Port of Spain
- Curepe → San Fernando

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
