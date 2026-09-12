# Part 2 — Sprint 3B: Rio Claro → Mayaro → Guayaguayare

## Scope
Reconstruct the southeast chain around Rio Claro, Mayaro, and Guayaguayare without inventing through-service.

## Strong evidence

### Mayaro ↔ Rio Claro
MOWT Legal Notice 165 (2015) explicitly assigns:
- Mayaro/Rio Claro maxi-taxis to Lane Four at the Mayaro Transport Hub.
- Mayaro/Rio Claro taxis to Lane Three at the Mayaro Transport Hub.

This is direct route evidence for a distinct Mayaro ↔ Rio Claro service.

### Mayaro ↔ Guayaguayare
The same Legal Notice explicitly assigns:
- Mayaro/Guayaguayare maxi-taxis to Lane Five.
- Mayaro/Guayaguayare taxis to Lane Two.

This is direct route evidence for a distinct Mayaro ↔ Guayaguayare service.

### Fare evidence
Newsday (2022) reports Route Four Association fares:
- Rio Claro → Mayaro: TT$10
- Mayaro → Guayaguayare: TT$9

This independently supports both legs as active named services.

## Business-logic conclusion
Treat this chain as two services meeting at Mayaro:

1. Rio Claro ↔ Mayaro
2. Mayaro ↔ Guayaguayare

Do **not** synthesize a direct Rio Claro ↔ Guayaguayare service merely because a rider can transfer in Mayaro.

## Derived-trip rules

### Allowed once intermediate boarding evidence is promoted
Intermediate trips may be derived only within the ordered stop list of the same service pattern.

### Not allowed
- Rio Claro → Guayaguayare as a single-seat through-service without direct evidence.
- Guayaguayare → Rio Claro as the reverse of the above.
- Treating the geographic continuation of Naparima-Mayaro Road / Guayaguayare Road as proof that the same vehicle continues across Mayaro.

## Transfer model
Mayaro should function as a transfer hub between the two confirmed services. The planner may return:

Rio Claro → Mayaro → Guayaguayare

with one transfer at Mayaro.

This is distinct from representing one through vehicle.

## Supporting road/stand evidence
MOWT Legal Notice 263 (2021) fixes the Mayaro/Mafeking taxi stand near the Guayaguayare-Mayaro Road intersection, which helps anchor the Mayaro-side boarding geography.

## Confidence
- Mayaro ↔ Rio Claro service existence: Confirmed
- Mayaro ↔ Guayaguayare service existence: Confirmed
- Mayaro transfer relationship between the two: Confirmed by distinct hub lane assignments
- Direct Rio Claro ↔ Guayaguayare through-service: Not supported
- Exact intermediate stop/hail points on either leg: requires separate promotion pass

## QA sanity checks
PASS: route existence supported by official MOWT lane assignments.
PASS: independent fare evidence matches both named legs.
PASS: no route-area-only inference used.
PASS: no reverse synthesized solely from opposite direction.
PASS: no through-service created across Mayaro without evidence.

## Sources
- MOWT Legal Notice 165 of 2015 — Mayaro Transport Hub lane assignments.
- MOWT Legal Notice 263 of 2021 — Mayaro/Mafeking taxi stand.
- Trinidad and Tobago Newsday, 2022-10-14 — Route Four fare changes.
