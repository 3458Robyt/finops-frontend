# Design — FinOps Inteligente

Locked Hallmark design system for the TAK Colombia FinOps application. This is a visual contract only: it must not alter APIs, permissions, data fetching, calculations, authentication, or route ownership.

## Genre

Modern-minimal with an editorial-operational tone: a calm control center for technical and financial decisions.

## Macrostructure family

- App pages: **Workbench**. The application is a working surface, not a marketing landing page.
- Dashboard variation: **Stat-Led** overview with one dominant financial narrative and supporting signals.
- Technical variation: split analysis workbench with persistent filters and a primary telemetry canvas.
- Data variation: catalogue/ledger composition for inventory, ingestion and history.
- Decision variation: evidence-first cockpit for recommendations and execution plans.
- Conversation variation: single-column conversational workspace with a stable composer.

## Theme

- `--color-paper`: `oklch(13% 0.012 255)` — graphite workspace
- `--color-paper-2`: `oklch(17% 0.014 255)` — primary surface
- `--color-paper-3`: `oklch(22% 0.016 255)` — raised surface
- `--color-ink`: `oklch(96% 0.008 95)` — warm primary text
- `--color-ink-2`: `oklch(77% 0.018 255)` — secondary text
- `--color-ink-3`: `oklch(61% 0.022 255)` — metadata
- `--color-rule`: `oklch(30% 0.018 255)` — hairline
- `--color-rule-strong`: `oklch(39% 0.02 255)` — active control border
- `--color-accent`: `oklch(86% 0.18 96)` — TAK yellow, reserved for action, focus and savings
- `--color-focus`: `oklch(78% 0.14 220)` — focus and telemetry accent
- `--color-info`: `oklch(76% 0.13 220)` — informational state
- `--color-positive`: `oklch(74% 0.16 150)` — verified result
- `--color-warning`: `oklch(82% 0.15 78)` — attention
- `--color-danger`: `oklch(70% 0.19 25)` — risk/error

No gradients, decorative glows or invented metrics. Yellow is an action signal, not a background theme.

## Typography

- Display: IBM Plex Sans Condensed, 600–700, roman.
- Body: Inter, 400–600.
- Mono: IBM Plex Mono, 400–600, for resource IDs, timestamps and telemetry.
- Headings use sentence case unless the product term itself is uppercase.
- Financial figures use tabular numerals and preserve their source currency.

## Spacing and shape

Use the 4-point scale in `tokens.css`. Prefer hairlines and negative space over nested cards. Controls use `--radius-control`; ordinary surfaces use `--radius-panel`; dialogs use `--radius-dialog`.

## Motion and interaction

- Only transform and opacity may animate.
- Use `--ease-out`, `--ease-in` and `--ease-in-out`; never browser-default easing.
- Loading states reserve their final space to prevent layout shifts.
- Focus tooltips appear immediately; hover tooltips wait 800 ms.
- Reduced motion collapses spatial transitions to an opacity crossfade of 150 ms or less.
- Every interactive component exposes default, hover, focus-visible, active, disabled, loading, error and success states.

## Navigation and responsive contract

- Desktop ≥1280 px: full navigation dock.
- 1024–1279 px: compact rail with accessible labels/tooltips.
- <1024 px: compact header, primary bottom navigation and a “Más” drawer containing every permitted module.
- The tenant selector remains reachable at every width.
- The page itself never scrolls horizontally; tables may scroll locally and retain all columns.

## Information-preservation rules

- Existing routes, role rules, API calls, fields, columns, chart statistics, tooltips, drilldowns, actions and async states remain available.
- Progressive disclosure may reorganize secondary information but may not remove it.
- No UI change may rename a value in a way that changes its meaning or currency.
- Existing `data-testid` selectors remain stable unless the test is updated with an equivalent semantic selector.

## Exports

The canonical CSS tokens are in `tokens.css`. Tailwind aliases must reference these variables. The backend and public HTTP contracts are outside this design system and must not be changed by a UI redesign.
