# Part 2 — Sprint 3C: Southwest through-service reconstruction

## Scope
Resolve an important remaining South/Southwest question: which services actually continue through intermediate hubs, versus requiring a transfer.

## New evidence

### Penal / Siparia → San Fernando maxi is a through service
A 2016 Newsday report describes a brown-band maxi taxi **plying the Penal/Siparia to San Fernando route**. The vehicle was observed on Gulf View Link Road in La Romaine and was followed back onto the SS Erin Road.

This is stronger than merely having separate Penal↔Siparia and San Fernando↔Penal taxi services. It establishes a maxi service whose passenger market spans Penal/Siparia and San Fernando.

Source: Trinidad and Tobago Newsday, 2016-03-18, “Licensing officers seize maxi taxi No chassis number found.”

### Siparia → San Fernando passenger path
A 2012 Newsday account from a regular commuter describes the practical Siparia→San Fernando path as:
Siparia → Murray Trace → Pluck Road / San Francique → Woodland → La Romaine → Cross Crossing → San Fernando.

This is passenger testimony rather than an operator timetable, so it is useful for reconstructing the likely local corridor but should not by itself promote every named point as a guaranteed maxi stop.

### Siparia ↔ Fyzabad is a dedicated route
A 2018 Newsday report identifies a driver on the **Siparia to Fyzabad route**. This means Fyzabad must not be inserted automatically into the Penal/Siparia→San Fernando pattern simply because it belongs to the southwest transport region.

### Siparia hub has distinct destination movements
2023 Carnival traffic regulations separately describe traffic between Siparia and San Fernando, Fyzabad and Erin, and separately relocate Erin, Penal, San Fernando, Siparia taxi/maxi stands. Temporary Carnival stand locations are not permanent boarding evidence, but the destination distinctions are useful corroboration that these are separate route markets.

## Working pattern family

### Pattern A — Siparia / Penal → San Fernando maxi
Status: supported through-service
Pattern type: local / corridor

Working spine for further mapping:
Siparia → San Francique area → Woodland → La Romaine → San Fernando

Penal is explicitly part of the service market in the 2016 report, but its exact ordered relationship to the quoted 2012 Siparia path needs road/path reconciliation before we freeze one canonical stop sequence.

Important: do not model Siparia→San Fernando as necessarily requiring a transfer at Penal. Evidence now supports a one-seat brown-band maxi service.

### Pattern B — Siparia ↔ Penal route taxi
Status: confirmed dedicated local service
Short-drop behavior supported by fare reporting.

### Pattern C — Siparia ↔ Fyzabad route taxi
Status: confirmed dedicated service
Keep separate from Pattern A until evidence proves Fyzabad is served by the same through maxi pattern.

### Pattern D — Siparia ↔ Erin
Status: separate southwest route market corroborated by traffic/stand regulations; exact current service mode/pattern remains to be reconstructed.

## Business-logic QA

PASS: allow a direct Siparia→San Fernando maxi option once canonical nodes are mapped.
PASS: keep Siparia↔Penal taxi as its own pattern even though a longer maxi service overlaps the region.
PASS: treat San Francique/Woodland/La Romaine as corridor research anchors for the Siparia→Sando pattern.
FAIL: force every Siparia→San Fernando rider to transfer at Penal.
FAIL: infer Fyzabad as an intermediate stop on the Sando maxi solely because Siparia↔Fyzabad taxis exist.
FAIL: infer Erin as part of the Sando pattern.
FAIL: promote every settlement mentioned in a commuter road description as a guaranteed boarding point without service-behavior evidence.

## Why this matters
This is exactly the corridor model TransitTrinidad needs: overlapping local services can coexist with a longer through-service. The graph should represent both rather than reducing the region to endpoint pairs or forcing unnecessary transfers.

## Next chunk
Finish the remaining Route 4 southern branches: Princes Town↔Moruga / St Mary's and New Grant / Sixth Company relationships, then run the South-wide logic consolidation before Tobago.
