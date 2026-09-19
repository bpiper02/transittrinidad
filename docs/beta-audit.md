# Beta audit — 2026-09-19

Baseline recovered work

The worktree is on the recovered beta lineage: commit `20b5528` is explicitly the Workbench recovery of the Route Studio/trinimaps work. The retained routing, canonical data, browser mirrors and Route Studio files were present before this sprint.

Findings

A. Confirmed. `data/services.json` service `maxi-chag-san-fernando-out` stores the ordered Chaguanas, Chase Village, Couva, California, Claxton Bay, Marabella and San Fernando nodes. Its boarding note explicitly says “Local southbound Route 3 pattern via Southern Main Road.”

B. Confirmed. `src/routing-core.mjs` uses `stopNodeIds` through `patternStops()` to add each ordered segment to the routing graph.

C. Confirmed and corrected. Before this sprint, `public/app-v2.js:estimateRoadGeometry` constructed an OSRM request from origin and destination only whenever geometry was missing. Thus a local multi-stop corridor could be displayed on a fastest-driving highway. Geometry precedence now lives in `src/geometry-core.mjs` (mirrored in `public/src`) and supplies every stored corridor waypoint to OSRM; failed snapping uses the ordered-stop corridor instead.

D. Confirmed. `maxi-green-couva-to-san-fernando` and its reverse are endpoint-only Route 3 services, separate from the richer `maxi-chag-san-fernando` local pattern. Their data is not sufficient to call them duplicates, so none were deleted. Background rendering now preserves semantically/geometrically distinct patterns; the local shape is not silently collapsed to an arbitrary representative.

E. Difference documented. The southbound local pattern declares `corridor_hail` and `corridor_request`; its reverse has the reversed stored node sequence but no equivalent policy fields. Routing correctly uses its stored direction, while pass-through boarding/alighting is only inferred where the policy/evidence permits it.

F. Confirmed and corrected. `corridorGroups()` previously returned only `patterns[0]` for background geometry. `backgroundServices()` now deduplicates only geometrically and semantically equivalent patterns.

G. Confirmed. The old application used one OpenStreetMap raster style and had transport filter tabs only; it had no real Transit/Standard/Satellite map modes. Transit is now a keyless OpenFreeMap vector style; Standard uses OSM raster context; Satellite uses Esri World Imagery and falls back to Standard on style error.

H. The prior shell was an Apple-like “Transit Trinidad” sidebar, with route controls and map modes not visibly separated. The beta shell now uses lowercase trinimaps lockup, civic utility hierarchy, explicit map style control and feedback link. No official Trinidad-shaped logo asset was found in the repository; no logo has been invented.
