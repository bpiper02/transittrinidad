# Part 2 — Sprint 3, Chunk 1: San Fernando → Princes Town / Penal

## Goal

Reconstruct the local informal-transit behavior around San Fernando, Princes Town and Penal using the service-pattern model introduced in Part 1.

## San Fernando ↔ Princes Town

### Evidence

Current/modern reporting strongly supports this as a local road corridor, not just a terminal-to-terminal route.

- Newsday (2022-10-04) reports the Main Road Taxi Drivers’ Association operating along Naparima/Mayaro Road between Princes Town and San Fernando, explicitly naming intermediate villages including Iere, Mt Stewart and Cleghorn.
- The same article distinguishes normal on-route fares from extra off-route charges into side streets, which is strong evidence that riders board/alight along the corridor rather than only at terminal stands.
- Newsday (2022-10-14) reports the black-band San Fernando → Princes Town fare increasing to TT$9 and identifies the Route Four Blackband Association as serving more than 90 destinations across south-central and southeast Trinidad.
- Historical San Fernando stand information places both route taxis and maxis to Princes Town on Royal Road / Mon Repos Street side of San Fernando.

### Proposed service-pattern interpretation

Pattern class: `local`
Pickup policy: `corridor_hail`
Alighting policy: `corridor_request`

Tentative ordered served corridor:

San Fernando → Palmyra / Seegobin Trace area → Cleghorn → Mt Stewart → Iere → Princes Town

Important: the exact ordering and exact roadside pickup points for Palmyra/Seegobin/Cleghorn/Mt Stewart/Iere still need a road-level map pass before canonical mutation. The existence of intermediate service is strong; exact node placement is not yet equally strong.

### Safe derived-trip logic

Once those intermediate points are represented on the correct Naparima/Mayaro Road alignment, the same local pattern should be able to serve intermediate OD pairs such as:

- Mt Stewart → Princes Town
- Cleghorn → Iere
- Palmyra area → Princes Town
- San Fernando → Mt Stewart

These should be derived from the ordered pattern, not stored as separate services.

### Rejected assumptions

- Do not infer pickup inside side streets just because the taxi can go there for an off-route surcharge.
- Do not create a separate route for each village pair.
- Do not assume the reverse direction until independently modeled, even though two-way operation is locally plausible.
- Do not treat all Route Four destinations as lying on this same Naparima/Mayaro Road pattern.

## San Fernando ↔ Penal

### Current interpretation

This service exists and is already supported elsewhere in the project, but this chunk does **not** yet have enough road-level evidence to promote a detailed intermediate stop chain comparable to San Fernando ↔ Princes Town.

For now:
- keep San Fernando ↔ Penal as an existing directed service where already supported;
- do not fabricate intermediate settlement stops;
- defer its road-level pattern reconstruction to the next chunk together with Penal ↔ Siparia and southwest services, where the corridor relationships can be checked as one network rather than in isolation.

## Logic checkpoint

1. `San Fernando → Princes Town` is a genuine local corridor.
2. Intermediate service is supported by explicit on-route village/fare evidence.
3. Off-route paid diversions are not canonical corridor stops.
4. Exact road ordering/nodes need a map pass before live routing mutation.
5. `San Fernando → Penal` remains valid as a service but its intermediate chain is intentionally deferred.
