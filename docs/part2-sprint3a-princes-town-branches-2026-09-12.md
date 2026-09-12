# Part 2 Sprint 3A — Princes Town branch reconstruction

## Scope
Reconstruct Princes Town -> Rio Claro / New Grant / Tableland as service-pattern branches without assuming every Route 4 destination lies on one continuous line.

## Strong evidence

### Route 4 branch grouping
A 2017 Trinidad and Tobago legal notice separated Route Area 4 maxi-taxis in Princes Town into two operating groups:
- Princes Town -> Rio Claro, Moruga and St Mary's
- Princes Town -> Tableland, New Grant and Sixth Company

This is strong evidence that Rio Claro and Tableland/New Grant should not be modeled as one shared ordered service pattern merely because all are Route 4 destinations.

Source: Legal Notice No. 51 of 2017, Traffic Control (Experimental Scheme) (Princes Town Maxi-Taxi) Regulations, 2017.

### Fares confirm distinct destination markets
A 2022 Route Four Blackband Association fare release listed separate fares from Princes Town to:
- Rio Claro
- Moruga
- Tableland
- New Grant
- St Mary's
and a generic short-drop fare.

This supports active destination-specific patterns plus intermediate local trips within each pattern where the road path is supported.

Source: Trinidad and Tobago Newsday, 2022-10-14.

### Rio Claro hub confirms bidirectional service market
The Rio Claro Transport Hub lists separate lanes for Princes Town taxis and Princes Town maxi-taxis. This corroborates Rio Claro <-> Princes Town as a substantial direct corridor.

Source: TriniGo Rio Claro Transport Hub.

### Princes Town stand structure
TriniGo lists distinct Princes Town stands for:
- Rio Claro/Tableland taxis
- New Grant/Hindustan taxis

This is useful evidence that taxi operations may share stand geography while still representing separate destinations/patterns.

## Working pattern model

### Pattern A — Princes Town -> Rio Claro
Status: confirmed direct service; intermediate chain partially reconstructed.

Known route context:
- Naparima-Mayaro Road is the key eastbound corridor.
- A 2021 Guardian report on the Rio Claro/Princes Town route says a vehicle left Rio Claro toward Princes Town along Naparima-Mayaro Road and passed San Pedro before reaching Moruga Road.

Candidate ordered spine for further verification:
Princes Town -> eastbound Naparima-Mayaro Road communities -> San Pedro area -> Rio Claro

Do not yet promote every geographically intermediate settlement. Exact boardable points still require map/source confirmation.

### Pattern B — Princes Town -> Tableland
Status: confirmed destination-specific Route 4 service.

Do not assume this pattern continues to Rio Claro just because Tableland lies in the broader southeast road network.

### Pattern C — Princes Town -> New Grant / Hindustan
Status: confirmed destination-specific Route 4 service.

Recent travel reporting independently described a maxi leaving Princes Town for New Grant, supporting live service existence.

### Pattern D — Princes Town -> Sixth Company
Status: historically/regulatorily confirmed Route 4 branch; current exact operation requires stronger current evidence before promotion.

## Business-logic rules

1. Route Area 4 membership does not imply through-service.
2. A shared Princes Town stand does not imply identical stop sequences.
3. Rio Claro, Tableland and New Grant are separate destination patterns unless evidence proves a shared ordered trunk.
4. Intermediate trips can only be derived within a specific supported pattern.
5. A generic short-drop fare supports local stopping behavior, but it does not identify which settlements are valid stops by itself.
6. Reverse directions must be independently supported; Rio Claro -> Princes Town is corroborated by the Rio Claro hub, while other branches require their own reverse evidence.
7. Road geography is supporting evidence only; never auto-promote every settlement along Naparima-Mayaro Road.

## Derived-trip QA examples

Safe now:
- Princes Town -> Rio Claro: yes
- Rio Claro -> Princes Town: yes
- Princes Town -> New Grant: yes
- Princes Town -> Tableland: yes

Not safe yet:
- New Grant -> Rio Claro via one through maxi
- Tableland -> Rio Claro via one through maxi
- New Grant -> Tableland via one through maxi
- arbitrary Naparima-Mayaro roadside settlement -> Rio Claro without stop/pickup evidence

## Outcome
The Princes Town southeast network is a branch family, not one linear Route 4 corridor. The router should eventually model each branch separately and derive local trips only inside each branch's verified ordered path.

No canonical routing data was mutated in this sprint.
