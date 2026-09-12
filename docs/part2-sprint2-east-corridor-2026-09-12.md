# Part 2 Sprint 2 — East corridor reconstruction

## Goal

Reconstruct how Route 2 maxi services behave across the Port of Spain–East West Corridor without flattening distinct PBR, Eastern Main Road, and destination-specific patterns into one fake all-stop service.

## What the evidence supports

### 1. Route 2 uses both PBR and Eastern Main Road patterns
Newsday reports Route 2 maxis running along the Priority Bus Route and Eastern Main Road to destinations including La Horquetta, Maloney, Arima and Sangre Grande.

### 2. Destination-specific services are real
Current/recent reporting separately names Maloney, La Horquetta, Arima and Sangre Grande services. Guardian reporting in 2024 identifies a La Horquetta/Maloney Bay 4 at City Gate. A 2022 Newsday report separately confirms direct Port of Spain–Sangre Grande maxis and explains that travelling through Arima is an alternative, not the only service pattern.

### 3. Short-drop evidence is high-value
A 2021 fare report gives an ordered westbound ladder into Port of Spain:

- Arima
- D'Abadie
- Five Rivers
- Cane Farm/Tunapuna
- Curepe
- Port of Spain

This is stronger evidence for intermediate usability than merely observing that these places lie along the same road.

### 4. Arima has historically distinguished PBR and Main Road maxi patterns
An official Gazette traffic order separately references Priority Bus Route maxi-taxis and Main Road maxi-taxis at Arima. This is historical evidence, so it proves the pattern distinction exists but does not by itself establish every current intermediate stop.

### 5. Sangre Grande remains an active Route 2 endpoint
2026 Guardian reporting documents red-band maxi operations from the Brierley Street/Eastern Main Road hub in Sangre Grande.

## Proposed service-pattern model

### Pattern A — PBR short-drop / Arima corridor

Proposed ordered served areas:

Port of Spain → Curepe → Tunapuna/Cane Farm → Five Rivers → D'Abadie → Arima

This is the strongest East corridor candidate for intermediate-trip generation because the fare ladder independently establishes these places as passenger boarding/alighting markets.

Potential derived trips once mapped to canonical nodes:

- Curepe → Tunapuna
- Curepe → Five Rivers
- Tunapuna → D'Abadie
- Five Rivers → Arima
- D'Abadie → Arima

Direction must still be handled independently.

### Pattern B — Port of Spain → Maloney

Treat as a destination-specific pattern. Do **not** infer that it serves every point on Pattern A merely because part of its physical route may overlap the PBR.

### Pattern C — Port of Spain → La Horquetta

Also destination-specific. Sharing Bay 4 with Maloney at City Gate does not prove identical downstream pickup/alighting behavior.

### Pattern D — Port of Spain → Arima, Main Road variant

Official historical evidence establishes a distinct Main Road maxi class. The exact current sequence of intermediate communities needs more research before deriving local trips.

### Pattern E — Port of Spain → Sangre Grande direct

Direct service is established. Current evidence does **not** justify automatically treating Curepe, Arima or Valencia as stops on every direct Grande maxi.

### Pattern F — Arima → Sangre Grande local corridor

Arima–Grande service is established historically/currently enough to keep researching. Valencia is geographically on the Eastern Main Road corridor and is a plausible intermediate market, but that fact alone is insufficient to promote Valencia as a served point. Keep it as a research lead until boarding behavior is independently supported.

## Logic QA

### Safe

- Generate Curepe → Five Rivers from a PBR pattern only if both appear in the ordered served-point list and the service permits intermediate boarding/alighting.
- Keep Maloney and La Horquetta as separate destination patterns even if they share City Gate infrastructure.
- Allow direct POS → Sangre Grande without requiring an Arima transfer.
- Keep Main Road and PBR variants distinct.

### Unsafe

- Maloney → Arima because both are red-band destinations.
- La Horquetta → Sangre Grande because both are Route 2.
- Valencia → Sangre Grande merely because Valencia lies on the Eastern Main Road.
- Curepe → Sangre Grande on every Grande maxi.
- Auto-creating westbound patterns from eastbound evidence.

## Sprint result

The East corridor should be modeled as a **family of overlapping service patterns**, not one trunk line. The PBR short-drop ladder is currently the strongest candidate for safe intermediate-trip derivation. Destination-specific services to Maloney, La Horquetta and Sangre Grande should remain separate until their exact pickup/alighting behavior is reconstructed.

No live routing mutation is made in this sprint. Canonical promotion should wait until the major Part 2 corridor research passes are consolidated.
