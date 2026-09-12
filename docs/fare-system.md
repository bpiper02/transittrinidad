# Fare system

## Product rule

Every routable transit leg should display either a supported fare or an explicit estimate range. Missing fare data must never remove a route from routing.

Precedence:

1. Explicit fare record in `data/fares.json`
2. Current fare already stored on the service
3. Same-service intermediate-trip interpolation
4. Mode + distance estimate range
5. Conservative mode fallback range when distance is unavailable

Historical service fares are automatically treated as estimates rather than current exact values.

## Rider labels

- `TT$10` — exact current/verified or reported fare
- `Est. TT$10–12` — estimated range
- Multi-leg journeys sum leg minimums and maximums into one total range

## Canonical editable file

Edit only:

`data/fares.json`

Do not manually edit `public/data/fares.json`. The build command validates the canonical data and republishes an exact mirror.

A fare record contains:

```json
{
  "id": "example",
  "serviceId": "maxi-chag-san-fernando-out",
  "fromNodeId": "chag-maxi-area",
  "toNodeId": "sf-chag-maxi",
  "minTTD": 12,
  "maxTTD": 12,
  "confidence": "community_verified",
  "method": "association_confirmation",
  "sources": [
    {
      "name": "Route 3 association confirmation",
      "checkedAt": "2026-09-12"
    }
  ]
}
```

## Confidence values

Use:

- `official_current` — current operator/government fare
- `community_verified` — current driver/association/local confirmation
- `reported_current` — credible current report, not directly verified
- `estimated` — any calculated or historical-calibrated range

Do not add `unknown` fare records. Leave the record absent and let the estimator provide a range.

## Safe commands

Validate and publish after manually editing `data/fares.json`:

```bash
npm run fares:validate
```

Audit whole-network fare coverage:

```bash
npm run fares:coverage
```

Run all code/data regressions:

```bash
npm test
```

### Set or correct a fare without editing JSON

Exact association-confirmed fare:

```bash
npm run fares:set -- --service maxi-chag-san-fernando-out --from chag-maxi-area --to sf-chag-maxi --min 12 --max 12 --confidence community_verified --method association_confirmation --source-name "Route 3 association"
```

Estimated range:

```bash
npm run fares:set -- --service maxi-chag-san-fernando-out --from chag-maxi-area --to sf-chag-maxi --min 11 --max 13 --confidence estimated --method local_calibration
```

The command rejects:

- unknown service IDs
- unknown nodes
- nodes outside the selected service pattern
- reverse-direction edits against a directional service
- invalid ranges
- unsupported confidence values
- un-sourced confirmed/reported fares

It updates both canonical and browser fare files only after validation passes.

## How association corrections flow

Example:

1. App currently shows `Est. TT$11–13`.
2. Route association confirms the current fare is TT$12.
3. Run `fares:set` with `min=12`, `max=12`, `community_verified`, and the source name.
4. The explicit record replaces the estimate automatically because explicit supported data has higher precedence.
5. Run `npm test` before deployment.

No routing topology, route definitions, transfer logic, or schedules need to change.

## Estimation logic

The estimator intentionally avoids false precision.

When a full-service fare is known and a rider is making an intermediate trip on that same ordered service pattern, the engine estimates the sub-trip from its share of the service path and adds a safety band.

When no service fare is known, the engine uses broad fare bands calibrated by mode and approximate distance. If distance cannot be computed, it uses the widest fallback bucket for that mode rather than assuming a short trip.

These ranges are placeholders for field validation, not claims that operators price strictly by kilometre.

## Research policy

Older published fares are useful calibration anchors but are not automatically current. They are stored as `estimated` ranges unless current operation/fare is independently supported.

Current official and association-confirmed fares should progressively replace estimates. This lets rider-facing fare coverage remain complete while data quality improves over time.

## QA invariants

1. Confirmed/current fares override estimates.
2. Estimates never overwrite stronger fare evidence.
3. Reverse directions are separate.
4. Intermediate trips do not inherit the full endpoint fare.
5. Historical fares do not masquerade as current exact fares.
6. Journey totals sum leg ranges correctly.
7. `needs_review` services are excluded from default fare coverage reporting.
8. Fare edits cannot change routing topology.
9. Canonical and browser fare files must remain exact mirrors.
10. A routable service should never show `Fare unknown`; it receives a fare or an explicit estimate.
