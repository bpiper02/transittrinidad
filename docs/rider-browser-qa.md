# Rider browser QA

This sprint adds real Chromium interaction tests around the public planner instead of relying only on structural HTML/CSS assertions.

## Covered flows

- canonical network loads and route count renders
- local place autocomplete works without external geocoder dependence
- Couva → Chaguanas plans successfully
- changing transport mode re-plans the active trip without losing endpoints
- origin/destination swap preserves selected places
- a disconnected tracked place returns a clear no-route state instead of inventing service
- mobile viewport has no horizontal overflow
- primary controls meet a 44px minimum touch target
- mobile journey results remain inside the viewport

External MapLibre, Photon, OSRM and tile requests are mocked in browser tests so CI verifies Transit Trinidad behavior rather than third-party uptime.

## Run locally

```bash
npm install --no-save @playwright/test@1.55.0
npx playwright install chromium
npm run test:browser
```

The normal `npm test` suite remains fast and browser-free. GitHub Actions runs browser QA as a separate job.

## Rider polish included

- `viewport-fit=cover` for phone safe areas
- 44px minimum primary touch targets
- 16px planner input text to avoid mobile browser input zoom
- dynamic viewport units with `vh` fallbacks
- contained momentum scrolling for the journey panel
- explicit mobile keyboard hints for origin and destination fields

## Still manual / later

Chromium mobile emulation is not Safari. Before a broad public launch, do one physical iPhone Safari pass and one Android Chrome pass for keyboard behavior, map gestures, and browser chrome resizing.
