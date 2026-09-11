# Local transport coverage sprint — 11 September 2026

The dataset now contains **70 corridors**, up from 26: **23 Maxi**, **31 route-taxi**, 14 PTSC, one ferry and one water-taxi corridor. A corridor is not a promise of service in both directions. There are 104 stored directional patterns; 103 are eligible for routing and one unsupported reverse pattern is held. The graph has 86 transport nodes and 88 directional walking links. The five PTSC schedule records were not expanded in this sprint.

Of the eligible patterns, 77 informal-transport patterns are **reported**, not operationally verified. No numerical accuracy percentage is justified by this research. Website retrieval confirms that a source exists; it does not confirm that a vehicle is operating today.

## What changed

- Added 44 corridors, including Central and South interconnections, Southeast hub services, Northwest taxis and Tobago taxis.
- Chaguanas → Couva is an intermediate leg of the reported Chaguanas → San Fernando Maxi service. The evidence names Exchange as a fare stage. The Couva pin is an approximate town area, not a surveyed roadside stop. Reverse roadside boarding is still unresolved.
- Split the old synthetic POS–Curepe–Chaguanas–San Fernando Maxi chain. Separate services and explicit walks now represent changes of vehicle or stand.
- Separated Arima's mapped PBR/EMR Maxi platforms from the PTSC terminal. Removed the unsupported intermediate PTSC Arima stop from the direct POS–Grande pattern.
- Separated Maxi and taxi stands around San Fernando, Penal, Siparia, Chaguanas and Point Fortin. Added estimated walks to connect these services with the rest of the graph.
- Corrected the Mayaro, C3 and Gulf City locations. Also corrected a misplaced La Horquetta area pin found during the audit.
- Restored SF–Princes Town using specific service evidence and a Coffee Street stand listing. The Mayaro → Princes Town reverse pattern remains held.
- Added a reported-service label, source links, publication dates where known and boarding caveats to route details. Journey legs disclose reported operation and pickup uncertainty.
- Held patterns are excluded from both the graph and route browsing. Fixed an existing journey-display bug that treated an empty schedule array as a schedule.

## Evidence and regional decisions

| Region | Evidence found | Integration decision |
| --- | --- | --- |
| Central | [Route 3 fare stages, 2022](https://ianalleyne.org/the-chaguanas-to-san-fernando-maxi-taxi-fares-will-be-increased-with-effect-from-tuesday-21st-june-2022), [Chaguanas operators, 2025](https://www.guardian.co.tt/news/chaguanas-maxi-drivers-want-better-security-as-robberies-rise-6.2.2350220.4934d668b3), mapped stands | Chaguanas–SF and Curepe–Chaguanas Maxi services; outbound Couva stage; separate local taxi connections. Historical prices omitted. |
| Central local | [Historical transport guide](https://archives.newsday.co.tt/2007/04/21/visiting-the-heartlands-towns-and-villages/), [Couva taxi association](https://www.facebook.com/p/Chaguanas-St-Marys-Couva-Taxi-Association-100076587752656/) | Reported outbound Couva, California and Chase Village taxi links. Unresolved St Mary's/McBean destinations remain candidates. |
| South | [Penitence Street Couva stand report](https://newsday.co.tt/2020/05/04/2-women-knocked-down-as-driver-suffers-seizure/), [La Romaine/Gulf City association report](https://newsday.co.tt/2021/05/10/la-romaine-san-fernando-fare-rises-temporarily-by-2/), [historical C3 discussion](https://www.trinituner.com/v4/forums/viewtopic.php?t=745451) | Keep Maxi/taxi identities separate; mall coordinates represent destinations, not surveyed taxi bays. |
| South/Southwest | Reciprocal mapped stands; [firsthand December 2024 journey](https://www.travelerjack.com/2024/12/houston-trinidad-south-america.html); [Coffee Street Maxi listing](https://www.waze.com/live-map/directions/tt/san-fernando-city-corporation/san-fernando/princes-town-maxi-stand?to=place.ChIJYxXMKoqNNYwR_Y3dxqqrtuI) | Penal/Siparia, Point Fortin/SF, SF/Princes Town, SF/La Brea and selected outbound links. The firsthand account supports service, not current fares. |
| East | [Direct Grande service and Arima transfer account](https://newsday.co.tt/2022/08/24/yes-there-are-maxi-taxis-to-grande/), mapped Arima platforms | Separate direct and connecting services. Maloney/La Horquetta are destination areas; no invented reverse services. |
| Southeast | [Rio Claro hub directory](https://www.trinigo.com/trinidad-tobago/transport/rio-claro-mayaro/rio-claro/maxi-taxi-stand/rio-claro-transport-hub-rio-claro/), mapped Mayaro stands, [Princes Town–Rio Claro passenger report](https://newsday.co.tt/2024/05/07/tick-from-moruga-jailed-for-taxi-robberies/), [Route 4 association report](https://archives.newsday.co.tt/2013/09/05/transport-hub-for-south-taxi-drivers-coming-soon/) | Mayaro/Rio Claro services with distinct modes; Princes Town, Moruga, Guayaguayare and local taxi destinations where direction is supported. Directory opening hours are not transit timetables. Proposed hubs are not treated as built. |
| Northwest | Named mapped route-taxi stands | Add documented outbound destinations; unresolved local route extents and Maxi variants remain candidates. |
| Tobago | Scarborough's mapped Crown Point and Across stands; [official concessionaire announcement](https://www.facebook.com/PTSCTT/posts/-we-announce-the-introduction-of-maxi-taxi-concessionaires-on-the-scarboroughlan/1123368329796493/) | Crown Point/Buccoo/Bethel taxi legs connect to the ferry via explicit walks. Charlotteville/L'Anse Fourmi concessionaires await boarding and timetable resolution. School transport and charters excluded. |

## Location and direction rules

The live node file has 36 directory/map stand locations, 39 explicitly approximate areas and 11 pre-existing nodes without a location-confidence field. Mapped stands are not field verified. Place centroids and mall footprints must never acquire `verified_station` merely because their coordinates contain many decimal places.

Source snapshots retain the OSM object IDs and original tags. The Rio Claro hub coordinates come from the listing's structured geographic data. Coffee Street coordinates are the centre of the listing's full Open Location Code `772W7GGQ+XFF`; a directory location still needs local boarding confirmation.

Reciprocal stand evidence or an explicit two-way account supports paired patterns. A stand named for a destination otherwise supports the outbound direction only. A named area can be a drop-off estimate without establishing a return pickup. Separate destination alternatives at a mixed stand do not establish an ordered through-route.

Walking links were limited to reviewed hub clusters. New lengths are straight-line endpoint distance multiplied by 1.4, with a minimum allowance and walking-time estimate. They are not audited pedestrian routes, and crossing, accessibility and side-of-road details remain unconfirmed. The longest stored link is 1.038 km. Nearby stands are not collapsed into zero-cost transfers.

## QA gates and limitations

1. **Source audit:** removed generic legislation/homepage references as service proof, corrected synthetic stop chains and separated specific stands from approximate areas.
2. **Regional integration:** schema validation checked node references, directional patterns, duplicate IDs and transfer pairs. Overlong proposed hub links triggered review before acceptance.
3. **Journey regression:** checked direct Chaguanas → Couva; Maxi → walk → C3 taxi; both SF/Couva directions; Penal/Siparia; Mayaro/Guayaguayare; Scarborough ferry access to a taxi; and exclusion of unsupported reverse services.
4. **Application regression:** checked JavaScript syntax, data contracts, scheduling, PTSC intake, routing, UI contracts and public-data/module mirrors. These are automated checks, not a field trial or visual browser certification.

Durations remain estimates; waiting times, traffic and actual daily operation are not confirmed. Driving-engine map lines are estimated road geometry, not measured transit traces. The planner still supports an estimated local first/last connection when a stop is farther away; that estimate is not evidence of an additional known public route.

The application already uses external geocoding and road-routing services and browser-local caches. This sprint adds public route evidence, not passenger tracking. It does not justify a claim that all journey data stays on the device or that privacy has been independently audited.

## Review queue and maintenance

`data/source/local-network-review-2026-09-11.json` records each informal pattern's decision and a separate unresolved candidate queue. `local-route-inventory-2026-09-11.md` lists the integrated corridors and directional patterns. The queue is not counted as active coverage.

Priorities for local validation: Exchange/Couva roadside boarding in both directions; Chaguanas route-specific bays; C3 pickup; Princes Town return stands; Toco relocation; Tobago concessionaire terminals and schedules. A current operator or structured field report should update the individual service, boarding, fare or schedule claim rather than upgrade every claim at once.

This is a substantial evidence-backed expansion, not an exhaustive census of Trinidad and Tobago's informal transport. Coverage remains uneven where online records do not resolve operation or geography.

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database License. Source attribution is retained in the data and shown in reported-route details.
