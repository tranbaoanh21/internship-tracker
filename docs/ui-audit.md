# UI redesign audit

## Verification status

The pinned project skill `redesign-existing-projects` is installed at `.agents/skills/redesign-skill/SKILL.md`; its source commit and MIT license are recorded in `.agents/skills/redesign-skill/SOURCE.md`. It was applied through its required `scan → diagnose → fix` sequence. Baseline screenshots were captured before the focused fixes. Final screenshots use the same desktop and mobile viewports for comparison.

## Design read

Reading this as a focused productivity dashboard for internship candidates, with a calm professional language, neutral surfaces, one emerald accent, medium information density, and restrained motion.

## Baseline findings

The functional baseline already avoids common generic-dashboard problems:

- The primary navigation is compact and the page does not depend on a permanent sidebar.
- Status color is semantic and restrained; the page uses one emerald interaction accent.
- Desktop table and mobile cards represent the same data without horizontal overflow.
- The create/edit interaction uses a side panel rather than routing simple input through multiple pages.
- Loading skeletons, empty content, server errors, validation errors, pressed states, and keyboard focus are present.
- Typography uses tight display tracking, readable body line height, and tabular figures for metrics.

## Targeted redesign changes

- Use a warm-neutral canvas and crisp 1px dividers to separate hierarchy without heavy shadows.
- Keep cards only where they encode real status buckets; use table rows and whitespace for application records.
- Standardize corner radii: 16px for major surfaces, 12px for metric cards, 8px for controls.
- Use Phosphor icons consistently and avoid emoji or hand-authored SVG icons.
- Keep animation limited to opacity/transform feedback and respect `prefers-reduced-motion`.
- Add a skip link, visible focus indicators, real labels, contextual errors, and WCAG-aware foreground colors.
- Give the intro a purposeful surface and very subtle depth instead of leaving the upper page visually flat.
- Add `text-wrap: balance/pretty` to prevent awkward display and body-text orphans.
- Add a branded SVG favicon and Open Graph title/description/type metadata without introducing another dependency.

## Deliberate omissions

- No stock photography, cinematic scroll, glassmorphism, or decorative motion: those techniques would reduce dashboard clarity.
- No legal/cookie UI: this single-user local portfolio app does not collect accounts, analytics, or cookies.
- No font CDN: system fonts keep the build private, fast, and deterministic; typography character comes from scale, tracking, weights, and layout.

## Verification

- `npm run lint`
- `npm run test -w frontend`
- `npm run build`
- Browser-controlled desktop screenshot with an explicit 1440×900 viewport
- Browser-controlled responsive screenshot; the connected browser enforced a 487px minimum width despite a requested 390px override
- Keyboard pass: skip link, toolbar, table actions, side panel, and delete confirmation
- Playwright E2E: `chromium` and true Pixel 7 `mobile-chromium`, both passing

The before/after screenshots are generated from the Docker-served application. Browser QA confirmed semantic desktop table/mobile cards, no horizontal overflow at the available responsive viewport, autofocus in the side panel, Escape dismissal, URL synchronization, and no console warnings/errors. Automated dialog tests now cover focus trapping, focus restoration, and saving/deleting transitions; result counts are announced through a polite live region.
