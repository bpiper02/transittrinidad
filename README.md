> [!IMPORTANT]
> **Recovery status — 2026-09-23:** the legacy README below describes historical V1 framing and must not be treated as the current product or architecture specification. Start with [AGENTS.md](./AGENTS.md), then [docs/PRODUCT.md](./docs/PRODUCT.md), [docs/DOMAIN.md](./docs/DOMAIN.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/PLANS/RECOVERY.md](./docs/PLANS/RECOVERY.md). Rider-facing V1 feature work is frozen while V2 foundations are recovered.

# Transit Trinidad

A public transport atlas and routing foundation for Trinidad & Tobago, covering PTSC, maxi taxis, route taxis, water taxi, and inter-island ferry services.

## Local transport coverage

The September 2026 coverage sprint contains 70 corridors and 103 routing-eligible directional patterns, plus one held reverse pattern. Read the [sprint evidence and QA report](docs/local-network-sprint-2026-09-11.md) and [informal-route inventory](docs/local-route-inventory-2026-09-11.md). Reported routes have unconfirmed current operation, fares and departure times. `needs_review` patterns are excluded from routing and browsing; unresolved candidates remain in the source review ledger.

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Mapped stands and approximate areas carry separate location confidence.

## Phase 1

Build a trustworthy transport atlas before enabling A→B journey planning.

Phase 1 focuses on:
- structured service and transport-node data
- provenance and confidence on every route claim
- broad network coverage without inventing exact geometry
- a map-first interface for browsing services
- structured community corrections and confirmations

## Data principles

1. Service existence, exact path, fare, and schedule are separate claims with separate confidence.
2. Every public claim should have provenance and a last-checked date.
3. Historical or community-supplied information is labeled as such.
4. Community corrections create evidence; they do not silently overwrite canonical data.
5. The underlying model is a transport graph so the atlas can later support multimodal routing.

## PTSC catalog intake

Official PTSC directory cards are captured as dated source snapshots under `data/source/`. Run `node tools/ptsc-import.mjs <snapshot.json> <candidates.json>` to create review candidates. The importer normalizes official departure periods, service days, endpoint aliases, and fares, but sets `autoPromote` to `false`: a person must review endpoint mappings, duplicate variants, and schedule upgrades before changing the app's canonical `services.json` or `schedules.json`.
