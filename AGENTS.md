# Transit Trinidad agent guide

This repository is in recovery from a heavily vibe-coded V1. Do not treat existing runtime behavior as product truth.

## Read first
1. docs/PRODUCT.md
2. docs/FLOWS.md
3. docs/DOMAIN.md
4. docs/ARCHITECTURE.md
5. docs/DATA.md
6. docs/QUALITY.md
7. docs/BUGS.md
8. docs/DESIGN.md
9. docs/ASSUMPTIONS.md
10. docs/PLANS/RECOVERY.md

## Authority order
1. Latest explicit product-owner decision recorded in docs/DECISIONS.
2. Product and domain specifications above.
3. Verified evidence and canonical source records.
4. Tests that are consistent with those specifications.
5. Legacy implementation.

Existing code and tests never outrank product or domain truth.

## Engineering contract
- Mark material facts as CONFIRMED, INFERRED, CHOSEN, or UNKNOWN.
- No silent material assumptions.
- Missing data is not negative data.
- Never fabricate a service, transfer, schedule, fare, boarding point, or precise geometry.
- A corridor is not a service. A service is not a direction. A direction is not a pattern. Geometry is not routing identity.
- Search must not mutate the canonical network.
- Internal transfers require explicit evidence; geographic proximity alone is insufficient.
- Schedule eligibility is evaluated at actual boarding time and local operating day.
- Fare logic applies to boarded legs/rules, never blindly per graph edge.
- Query-local virtual access points never enter durable canonical state.
- Rendered behavior is part of correctness. Source inspection alone is not UI QA.
- A sprint is implemented by one bounded builder and reviewed independently.
- “Done” requires acceptance criteria, automated tests, adversarial review, and required human/rendered QA.

## Current gate
Do not add rider-facing features to V1. The next authorized work is the single bounded V2 foundation sprint defined in docs/PLANS/RECOVERY.md. Runtime migration beyond that requires the recovery gate to be re-evaluated.

## Evidence baseline
Recovery baseline: main at a9790cb87055c9d9aa548e0119de6ac8fd80d837 on 2026-09-23.
Investigative branch wb2/a9090e4c5607 is evidence, not approved code to merge wholesale.
