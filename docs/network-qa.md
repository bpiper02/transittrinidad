# Network QA

Transit Trinidad now has a deterministic quality layer over the canonical network.

## Run locally

```bash
npm run qa
```

For the full machine-readable report:

```bash
node tools/network-qa.mjs --json
```

The browser dashboard is `public/qa.html`. It computes directly from the same browser data used by the planner, so it cannot become stale independently of the network files.

## What it measures

- canonical/routable service and corridor counts
- fare coverage
- verified/partial geometry coverage
- timetable or frequency-window coverage
- service confidence
- approximate boarding locations
- held services
- routes with no represented reverse direction
- orphan network nodes
- tracked places with no routable node inside their routing radius

A missing reverse direction is a QA lead, not proof that reverse service exists. The dashboard deliberately says **reverse unconfirmed** rather than synthesizing a return route.

## Priority model

Critical issues represent graph blockers such as held services, missing node coordinates, or a tracked place with no nearby routable node. High issues are major confidence/boarding/geometry gaps. Medium issues are important missing fare, geometry or operating information. Low issues are research leads such as an unrepresented reverse direction or an orphan node.

Scores are prioritization aids only. They do not change routing eligibility or user-facing travel-time estimates.

## Repository integrity

`tests/repo-integrity.mjs` verifies that all canonical network JSON files exactly match their `public/data/` browser mirrors and that the browser QA core exactly matches the source QA core. This closes a previous silent-drift risk after manual edits or promotions.
