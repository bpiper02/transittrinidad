# Generated public artifacts

`src/` and `data/` are the canonical sources for browser-shared modules and runtime transit data.

The browser consumes generated mirrors under:

- `public/src/`
- `public/data/`

Do not edit those mirrors directly.

After changing a manifest-declared canonical file, run:

```bash
npm run build:public
npm test
```

`npm run check:public` compares every generated file byte-for-byte with its canonical source and also rejects undeclared files in the generated directories. CI runs this check before the test suite.

The generated-file manifest lives in `tools/public-artifacts.mjs`.
