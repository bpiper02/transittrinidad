# Static deployment and beta checklist

The public app is static: deploy the `public/` directory through the included GitHub Pages workflow. GitHub Pages serves HTTPS once Pages is enabled for the repository. No token, paid service, or runtime backend is required.

Local serve:

    python3 -m http.server 8080 --directory public

Then open `http://localhost:8080`. Run `npm run baseline:report` before a release to produce a current canonical-data baseline.

Before inviting Public Beta users:

- Enable GitHub Pages and verify its HTTPS URL.
- Run `npm test`, `npm run qa`, and `npm run corridors:check`.
- Check planner, Transit/Standard/Satellite controls, route issue and missing-route feedback at 360px, 390px, and 430px widths.
- Confirm each feedback path exports a draft and states that it is not published.
- Review Route Studio candidate JSON with the existing association promotion process; do not apply unreviewed candidates.
- Confirm source attribution and no precise location/query data is retained in privacy-light analytics.
