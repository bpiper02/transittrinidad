# Assumptions and unresolved questions

Nothing in this file may silently become product truth. Each item is labeled.

## CHOSEN architectural assumptions
A-001: V2 starts with versioned files rather than a database. Reason: semantic correctness is the blocker; current scale does not require a DB. Revisit when editing/concurrency/query needs justify it.

A-002: America/Port_of_Spain is the canonical service timezone unless a source explicitly says otherwise.

A-003: Search may use external geocoders for Places, but geocoder output cannot create canonical transit service/transfer truth.

A-004: Canonical network snapshots are immutable during a planning request.

A-005: Internal transfer edges require explicit Transfer Link evidence. Distance may be used to flag candidates for review, never to authorize them.

A-006: Query-local walking/access computation is conceptually separate from an internal interchange.

A-007: Uncertainty is represented per claim dimension, not one all-purpose confidence score.

## CONFIRMED constraints
A-010: Do not synthesize reverse service.
A-011: Do not fabricate schedules, fares, route geometry, or route-taxi services.
A-012: Missing data is not evidence of nonexistence.
A-013: Existing tests may be wrong and are subordinate to recovered product/domain truth.
A-014: Current V1 rider-facing feature work is frozen until recovery gate conditions are met.

## INFERRED but requires field/data confirmation
A-020: Some maxi and route-taxi patterns support corridor hail/request-stop access. This is true for specific evidenced patterns, not a mode-wide default.
A-021: Many current split terminal/stand nodes should remain distinct physical Access Points connected by explicit Transfer Links rather than merged.
A-022: Several PTSC official records with the same endpoints/stop sequence are distinct schedule/service-class source records rather than distinct rider directions.
A-023: Some current estimated-walk transfer records are physically valid, but each must be audited for actual pedestrian/interchange feasibility.

## UNKNOWN / blockers
U-001: Exact canonical grouping of all 102 PTSC legacy records into Service, Direction, Pattern, and Trip/Operating Rule. This requires a deterministic migration report plus source review.

U-002: Verified route shape for all current patterns. Current canonical geometry coverage is zero.

U-003: Verified boarding/alighting policy for most maxi and route-taxi services. Only seven legacy service rows carry explicit boarding/alighting policy fields.

U-004: Physical validity/accessibility of all 88 stored walking transfers.

U-005: Complete current fare coverage for informal modes. Fares exist for many routes, but 74 routable legacy service rows have neither a service-level fare nor service-scoped fare record in the current snapshot.

U-006: Complete operational schedule/frequency coverage. Only five schedule records contain published departure times; many informal services use frequency notes, and current PTSC official pages expose more timetable data than the canonical snapshot currently captures.

U-007: Current ferry schedule ingestion strategy. Official ferry schedules are dated and can change through bulletins; a static timeless schedule is inappropriate.

U-008: Final production hosting/deployment path and branch protection. Recovery found no repository rulesets and no deployment workflow in .github/workflows.

U-009: Final visual asset/logo for “trinimaps.”

U-010: Whether any code from wb2/a9090e4c5607 should be cherry-picked after V2 planner boundaries exist.

## How blockers are resolved
- Domain/data ambiguity: source-backed migration report, then product/domain review only for truly ambiguous cases.
- Physical access/transfer: field review, mapped pedestrian evidence, or authoritative facility evidence.
- Geometry: official/association/field-reviewed shapes; estimated road geometry remains explicitly lower-trust display fallback.
- Schedules: repeatable source ingestion with freshness and dated validity.
- Design: rendered visual QA against docs/DESIGN.md, not source regex alone.
