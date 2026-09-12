# Field Route Review

`/field-review.html` is the local-first validation surface for drivers, dispatchers, route coordinators and association representatives.

## What it does

1. Loads the current public route and node files in the browser.
2. Lets a reviewer choose one directed service they actually know.
3. Captures whether the service is correct or needs correction.
4. Captures corrected fare, ordered route points, local/limited/express behavior, boarding behavior, alighting behavior, roads used and free-text notes.
5. Exports the result in the existing association-intake JSON schema.

The page does **not** write canonical route data.

## Promotion path

```text
field-review.html
  ↓ export JSON
association-import.mjs
  ↓ candidate bundle
association-review.html
  ↓ explicit accept/reject decision
association-promote.mjs
  ↓ validation + audit
canonical data
```

This keeps field testimony valuable without making one person's answer silently authoritative.

## Reviewer instructions

Ask the reviewer to validate only a route they personally know. Work one direction at a time. The most useful questions are:

- Is this service actually operating in this direction?
- Are these points in the correct travel order?
- Can passengers hail the vehicle along the road, or only at fixed stands/stops?
- Can passengers request a drop along the corridor?
- What is the current fare for the route shown?
- Is this local, limited-stop or express/highway service?
- Does every vehicle serve these points, or only some variants?

If they are unsure, leave the field unchanged or note the uncertainty. Do not pressure a reviewer to validate another association's route, exact schedules they do not know, or a reverse direction they did not confirm.

## Data safety rules

- A field review cannot directly publish data.
- Unknown route-point names are blocked from export.
- Duplicate route points are blocked.
- Field review cannot downgrade an existing `verified_service` confidence level.
- New boarding/alighting policies are validated against the same service-pattern vocabulary used by routing.
- Promotion still runs the canonical dataset validator and creates an audit record.
