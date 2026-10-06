# Public release verification

Release candidate assembled on 2026-10-06. This repository contains the web client only; backend credentials, provider secrets, customer data, and deployment environment files are not part of the frontend bundle.

## Verification performed

- Clean dependency installation with `npm ci`.
- `npm run lint` passed.
- `npm run build` passed (436 modules transformed).
- `npm audit --omit=dev` reported zero vulnerabilities.
- Full development dependency audit reports five high and two moderate findings in development tooling. Resolving them entails a major Tailwind v4 migration and is deferred for a dedicated visual regression.

No authenticated customer UAT or full Playwright run against a backend was performed during repository preparation. Public visibility does not imply an open-source license.
