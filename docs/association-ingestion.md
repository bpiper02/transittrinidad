# Association data ingestion

Transit Trinidad treats association/operator information as high-value structured evidence, but does not let an intake file silently overwrite canonical routing data.

## Workflow

1. Copy `docs/association-intake-template.json` and replace the example values with the association's information.
2. Keep each direction as a separate route record. Do not infer the reverse direction.
3. Add known canonical `nodeId` values where available. Otherwise provide the stand/pickup-area name and coordinates when known.
4. Record ordered intermediate pickup/transfer points when the association confirms them.
5. Add road/path notes and exact geometry only when supplied or verified.
6. Record the current fare as `fareTTD`.
7. Record operating days, first/last service, rough headway, exact departure times, and free-text operational notes independently.
8. Run:

```bash
node tools/association-import.mjs docs/association-intake-template.json /tmp/association-candidates.json
```

9. Review the candidate file before changing canonical `data/nodes.json`, `data/services.json`, or `data/schedules.json`.
10. Run `npm test` after promotion and mirror canonical browser data under `public/data/`.

## Candidate statuses

- `existing_service_upgrade_review`: the route direction matches an existing service and may improve fare, confidence, path or operating information.
- `new_service_review`: both endpoints map to existing nodes but the directed service does not yet exist.
- `new_nodes_and_service_review`: one or more supplied boarding points have coordinates but do not match existing nodes.
- `needs_endpoint_mapping`: at least one endpoint has insufficient information to map safely.

All generated files set `autoPromote: false`.

## Schedule rule

Exact departure times and frequency/service-window information are different claims.

If an association says vehicles normally operate from 05:30 to 21:00 every 5–15 minutes, Transit Trinidad records that as frequency-based availability. It does **not** invent departures at 05:30, 05:40, 05:50, etc.

If the association provides actual departure times, the importer may propose a canonical schedule record for review.

## Fare rule

A current fare supplied by an association is staged as `community_verified` evidence until reviewed. Segment fares, zone fares, student fares and other special rules should be preserved in notes until the canonical fare model is expanded; they must not be collapsed into a misleading flat fare.

## Location rule

Coordinates supplied through intake can create a proposed node, but the proposed node begins as `approximate_area` unless stronger evidence is available. Association confirmation of the exact physical stand can later upgrade that location confidence.

## Corrections

Never delete historical evidence when an association corrects a route. Keep the original intake file and create a new dated submission. The newer reviewed record becomes canonical while the intake history remains an audit trail.

## Future live layer

Static association intake is intentionally separate from future live vehicle state. A later vehicle feed can attach:

- association/operator vehicle ID
- current GPS position
- route/service pattern ID
- direction
- seats/capacity status
- accepting pickups/reservations
- last update time

That live state should never overwrite the static route definition.
