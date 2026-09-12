# Association review and promotion

Transit Trinidad keeps association intake separate from canonical route data.

## Flow

1. Create an intake JSON from `docs/association-intake-template.json`.
2. Generate review candidates:

```bash
node tools/association-import.mjs submission.json candidates.json
```

3. Review candidates either by editing a review JSON based on `docs/association-review-template.json` or by opening `tools/association-review.html` locally and loading the candidates file.
4. Dry-run promotion:

```bash
node tools/association-promote.mjs candidates.json review.json
```

Dry-run validates the complete proposed dataset and prints the change report without writing files.

5. Apply only after the dry-run is clean:

```bash
node tools/association-promote.mjs candidates.json review.json --apply
```

Apply writes the validated `nodes`, `services`, `transfers`, and `schedules` to both `data/` and `public/data/`, then writes a sanitized audit artifact under `data/promotions/`.

## Safety rules

- Only explicit `accept` decisions can promote a candidate.
- `needs_endpoint_mapping` candidates cannot be promoted.
- Rejected and unreviewed candidates do not mutate data.
- No reverse service is synthesized.
- Proposed schedules must survive canonical overlap validation; conflicting schedule coverage is rejected instead of silently replacing published data.
- Applying the same accepted candidate again is idempotent by canonical ID.
- Every resulting dataset is passed through `validateDataset` before any write occurs.

## Provenance and privacy

Web sources retain their existing URL-based source format.

Association-confirmed canonical records use a public-safe source object:

```json
{
  "name": "Example Maxi Taxi Association",
  "kind": "association_contact",
  "referenceId": "submission-2026-09-12",
  "checkedAt": "2026-09-12"
}
```

Names, phone numbers, email addresses, WhatsApp details, and other contact channels stay in local intake/candidate files and are not copied into canonical or browser data.

`data/submissions/`, `data/candidates/`, and `data/reviews/` are gitignored for this reason.

## Mental model

Association says X → importer maps X to the current graph → reviewer accepts/rejects → promotion core applies accepted changes to a copy → complete graph validation → optional explicit write.

The review page is intentionally local/static. There is no hosted admin backend, auth layer, or database yet.
