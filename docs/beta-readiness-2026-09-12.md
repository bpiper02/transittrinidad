# Transit Trinidad — Pilot / Beta Readiness Checkpoint

## Current release state

**Target state after this sprint: field-pilot ready, not yet declared public-beta validated.**

The software gate is intentionally separate from real-world validation. Passing CI means the planner is internally consistent across the routes we have modeled. It does not mean every Trinidad & Tobago transport fact has been field-verified.

## Technical gate

Run:

```bash
npm run pilot:check
npm run pilot:check:browser
```

The first command runs the full data/unit suite, the 30-journey golden set, field-review pipeline tests, the explicit pilot readiness invariants, network QA and corridor-manifest validation.

The second command runs the rider and field-review flows in desktop and mobile Chromium.

## What must remain true

- At least 30 golden rider journeys pass with no loops and valid fare/range output.
- All tracked places retain access to a routable transport node.
- Canonical transport nodes have coordinates.
- Central–South local corridor behavior retains intermediate roadside hail/request semantics.
- Eastbound and westbound Route 2 patterns remain separately modeled.
- Point Fortin services cannot silently inherit La Brea as an intermediate stop.
- Tobago Northside and Windward route families remain distinct.
- `needs_review` research leads never enter default routing.
- Field-review exports cannot bypass association candidate review and promotion.
- Unknown/duplicate route points cannot be exported from field review.
- Existing official service evidence cannot be downgraded by a field review.

## What is deliberately not a blocker for the field pilot

These remain network-improvement work rather than reasons to prevent a controlled pilot:

- incomplete verified route geometry;
- missing exact timetables for frequency-based informal services;
- weak or missing fares outside the golden/pilot journeys;
- approximate-area boarding nodes clearly labeled as such;
- explicitly held research leads;
- unrepresented reverse directions where no independent evidence supports them.

We should fix these progressively from field evidence rather than fabricate precision.

## Field-pilot exit criteria

Before calling the product public-beta validated, complete the reviewer sessions in `pilot-pack-2026-09-12.md` and require:

- ≥90% of tested locally known journeys are usable;
- zero P0 invented services, wrong directions or impossible transfers;
- ≥80% of boarding instructions are understandable without developer explanation;
- all P0/P1 corrections are either promoted or explicitly held with a reason;
- at least one non-developer can complete `/field-review.html` and generate valid review JSON unaided.

## Release decision

A green technical gate means **ship to a controlled field pilot**.

A green technical gate plus the field-pilot exit criteria means **candidate for a small public beta**.

This distinction protects the product from treating internally consistent data as automatically true real-world transport data.
