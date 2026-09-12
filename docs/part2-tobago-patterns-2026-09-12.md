# Part 2 — Tobago service-pattern reconstruction (2026-09-12)

## Goal
Reconstruct Tobago as a set of overlapping directional transit patterns instead of one island-wide line. Keep PTSC buses, route taxis and blue-band maxi behavior separate where their service rules differ.

## High-level result
Tobago is best represented as three major corridor families radiating from Scarborough:

1. West / southwest
2. Northside
3. Windward / east

These families overlap geographically in places, but should not be flattened into one pattern.

## 1. West / southwest family

### Scarborough ↔ Crown Point / Canaan / Bon Accord / Lowlands taxi corridor
Current taxi evidence is strong.

Newsday (2022-02-24 and 2022-03-15) reports the West-End Taxi Association and fares between Scarborough and:
- Canaan / Bon Accord
- Crown Point / ANR Robinson International Airport
- Pigeon Point
- Lowlands / Gulf City area

The same reporting explicitly mentions short drops between Crown Point and Scarborough and extra charges for off-route passengers. This supports a genuine local corridor with intermediate passenger markets rather than terminal-only use.

Working pattern interpretation:
- pattern type: `local`
- pickup/alight: corridor/local taxi behavior
- exact intermediate ordered stop list still needs road-level promotion
- off-route home/workplace deviations are not canonical stops

### PTSC west branches
PTSC currently lists separate Scarborough routes to:
- Buccoo
- Black Rock / Courland
- Plymouth via Arnos Vale
- Crown Point / Plymouth-related service in historical schedule mirrors

These should remain separate PTSC patterns even though they overlap in western Tobago.

Historical PTSC reporting also says Crown Point and Plymouth routes served western communities including Lowlands, Canaan, Bon Accord, Buccoo, Mt Irvine, Pleasant Prospect, Black Rock, Courland and Plymouth. Use that as historical corridor context, not proof that every present-day branch stops at every one of those places.

## 2. Northside family

### Scarborough ↔ L’Anse Fourmi
This is a distinct PTSC corridor and one of the strongest Tobago intermediate-pattern candidates.

Current PTSC route archives list Scarborough / L’Anse Fourmi, including weekend service.

A 2022 PTSC disruption notice is especially useful because it explicitly names the corridor in two segments:
- lower North Side Road: Moriah, Runnemade, Des Vignes Road, Mt Dillon
- upper North Side Road: Upper Castara, Parlatuvier, Bloody Bay, L’Anse Fourmi

That gives a supported working spine:

Scarborough → Moriah → Runnemade / Des Vignes / Mt Dillon area → Castara → Parlatuvier → Bloody Bay → L’Anse Fourmi

Do not treat every settlement as an exact formal bus stop yet, but this is strong road-path and service-area evidence.

Historical traveller reporting independently describes Scarborough → L’Anse Fourmi passing Mason Hall, Moriah, Castara and Parlatuvier. This is supporting evidence only, not the primary source.

Important: this Northside route is separate from the Windward/Charlotteville route.

## 3. Windward / east family

### Scarborough ↔ Charlotteville PTSC
Current PTSC archives list Scarborough / Charlotteville, including weekend operation. THA and Newsday reporting also independently confirm buses dispatched on this route.

The Windward side corridor should be modeled separately from the Northside road.

Supported working east-side geography is:
Scarborough → Bacolet / Mt St George / Goodwood area → Roxborough → Speyside → Charlotteville

Current evidence strongly supports the endpoints and the Windward-road family. Roxborough and Speyside are highly plausible served markets on the Charlotteville corridor, but intermediate stop promotion should still be tied to route evidence, not geography alone.

### Scarborough ↔ Roxborough / Goodwood / Mt St George
Historical and independent schedule mirrors list Scarborough → Roxborough and Scarborough → Goodwood via Mt St George as PTSC services. These should remain separate service patterns where independently supported rather than being assumed as sub-routes of every Charlotteville bus.

## 4. Blue-band maxi pattern

Tobago is unusual because published transport guides consistently describe the blue-band maxi network as essentially one public route:

Scarborough ↔ Charlotteville

with other blue-band maxi uses largely school/private-tour related.

The same guides describe maxi behavior as:
- no fixed timetable
- hail along the route
- alight at requested points

That means the Tobago blue-band maxi is a particularly good fit for the service-pattern model:

Scarborough → supported Windward intermediate communities → Charlotteville

with derived intermediate journeys only where the ordered route path is established.

Do not merge PTSC stop policy with maxi hail/drop policy merely because they share the same corridor.

## 5. East/west route taxi split

Tobago taxi reporting supports a practical split between:
- west-end taxi operations from Scarborough toward Crown Point / Canaan / Bon Accord / Pigeon Point / Lowlands
- east / windward / northern taxi operations serving Bacolet, Charlotteville, Bloody Bay, L’Anse Fourmi, Moriah and related communities

Newsday (2022-03-08) reports the Windward Taxi Drivers Association and fare changes covering Bacolet, Charlotteville, Bloody Bay, L’Anse Fourmi and Moriah. This confirms eastern/northern taxi markets but does not prove a single taxi serves all of them in one continuous through pattern.

## Business-logic rules

1. Scarborough is a hub, not proof of shared stop sequences.
2. Northside and Windward are separate corridor families.
3. PTSC, route taxis and blue-band maxis can share roads without sharing stop policy.
4. Short-drop fare evidence supports intermediate use but not exact node placement by itself.
5. Off-route home/workplace diversions are never canonical stops.
6. Historical schedule mirrors may support continuity/geography, but current PTSC pages and current/recent reporting outrank them.
7. Do not infer a transfer-free trip simply because two services overlap at Scarborough or another settlement.
8. Direction remains explicit; reverse should be independently represented where supported.

## Strongest candidates for eventual intermediate-trip generation

### Northside PTSC
Scarborough → Moriah → Castara → Parlatuvier → Bloody Bay → L’Anse Fourmi

Potential derived rides once exact nodes are promoted:
- Moriah → Castara
- Castara → Parlatuvier
- Parlatuvier → L’Anse Fourmi
- Scarborough → Castara

### West-end taxi
Scarborough → Lowlands / Canaan / Bon Accord → Crown Point

Potential derived rides once exact ordering is established:
- Lowlands → Crown Point
- Canaan → Scarborough
- Crown Point → intermediate west-end short drop

### Windward / Charlotteville maxi or PTSC
Scarborough → east-side communities → Charlotteville

Potential derived rides only after route-level intermediate service evidence is promoted.

## What is not safe yet
- Castara → Charlotteville as one-seat service solely because both lie in northern Tobago.
- L’Anse Fourmi → Charlotteville as one through route without evidence.
- Buccoo → Plymouth because both are west-side destinations.
- Crown Point → Buccoo because both are in the western tourism belt.
- Treat every Charlotteville PTSC bus as guaranteed to serve Roxborough/Speyside until the exact current pattern is confirmed.
- Treat every eastbound taxi as one continuous Bacolet → Charlotteville → L’Anse Fourmi route.

## Research conclusion
Tobago should be modeled as a hub-and-branch network with three major corridor families and mode-specific behavior. The Northside route currently provides the clearest evidence for a multi-stop ordered pattern. The west-end taxi corridor also has unusually good short-drop evidence. The Windward/Charlotteville family is definitely real, but exact intermediate promotion should remain a separate pass.

No canonical routing data was mutated in this sprint.

## Sources used
- PTSC Scarborough route archive (current)
- PTSC Scarborough / Buccoo route page
- PTSC Scarborough / Plymouth via Arnos Vale route page
- PTSC weekend Charlotteville and L’Anse Fourmi listings
- PTSC main site current Scarborough → Buccoo promotion
- Newsday, 2022-02-24, Tobago taxi fares to increase by $1 from March 15
- Newsday, 2022-03-15, Taxi fares in west Tobago increased by $1
- Newsday, 2022-03-08, Tobago East taxis agree to $1 increase
- Loop News, 2022-09-02, PTSC adjusts service in L’Anse Fourmi after landslip
- Tobago House of Assembly, 2018-06-06, PTSC quickly resolves minor problems experienced on buses today
- Newsday historical PTSC Tobago service reports
- Rough Guides / UWI practical transport descriptions for blue-band maxi behavior
