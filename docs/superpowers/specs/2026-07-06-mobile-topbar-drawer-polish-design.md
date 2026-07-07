# Mobile Top-Bar + Drawer Nav, Hero Reflow, and Visual Polish — Design

Date: 2026-07-06

## Goal

The site (React + Vite + TS, single-scroll portfolio with a fixed left sidebar) currently "handles mobile" by shrinking the sidebar to a 72px icon-only rail with no labels below 980px — the nav buttons remain in the DOM but render as empty, unlabeled, effectively invisible tap targets, so mobile visitors have no way to navigate to Projects/Resume except manually scrolling. Separately, the hero section forces a fixed-height side-by-side row (intro text + a fixed 280×392px draggable 3D card) that doesn't fit narrow viewports. This pass:

1. Replaces the broken mobile sidebar behavior with a proper top bar + slide-out drawer.
2. Fixes responsive sizing on the hero, the 3D card, and the URDF rover viewer so nothing overflows or clips on small screens.
3. Does a scoped visual-consistency pass within the current dark/light palette and Inter typeface — spacing, type scale, button/card chrome, contrast, touch targets — not a re-theme.

Explicitly out of scope: any new color palette, font pairing, or animation/motion library (no Framer Motion); redesigning the internal structure of the rover timeline, GitHub card, project stat charts, 3D card, or resume list — those keep their current layout and just become responsive.

**Prerequisite (already done):** theme state was lifted out of `Sidebar`-local state into a shared `src/hooks/useTheme.ts` hook, consumed by `App.tsx` and passed down as props. This is committed (`refactor: lift theme state into shared useTheme hook`) and is what lets a second nav surface (the new mobile drawer) toggle the same theme without desyncing — this spec builds on it rather than repeating it.

## 1. Mobile Navigation — Top Bar + Slide-Out Drawer

- Two states instead of three: a **desktop rail** (≥860px — today's expandable 240px/72px sidebar via the existing collapse toggle, completely unchanged) and a **mobile header** (<860px).
- New component `src/components/MobileHeader.tsx`: a slim fixed-to-top bar (~52px tall + `env(safe-area-inset-top)`), containing a hamburger button (opens the drawer), a small site mark/name, and the existing theme-toggle button (reusing `theme`/`onToggleTheme` props already threaded through `App.tsx`).
- New component `src/components/NavDrawer.tsx`: a full-height panel that slides in from the left over a dimmed backdrop when the hamburger is tapped. Contains the same three nav actions as the desktop sidebar (Home / Projects / Resume), reusing the exact same click behavior — `scrollTo({top: 0})` for Home, `getElementById('projects')?.scrollIntoView(...)` / `getElementById('resume')?.scrollIntoView(...)` for the others. Tapping a nav item, the backdrop, or an explicit close (✕) button all close the drawer. Body scroll is locked while the drawer is open.
- Both new components render unconditionally in the DOM but are shown/hidden via CSS (`display: none` above 860px, shown at/below) — matching the existing pattern used for the current sidebar breakpoint rules, so there's no layout-shift/hydration flicker.
- `Sidebar.tsx` itself is unchanged in markup; only the surrounding breakpoint CSS changes (sidebar hidden below 860px instead of shrinking to an icon rail).
- `.content-area` / `.site-main` gets top padding added at the mobile breakpoint so content isn't hidden under the fixed header (`fixed-element-offset` guidance), and the drawer's own z-index sits above page content but below any open `Modal`.
- Every drawer/header tap target (hamburger, close button, nav items, theme toggle) is ≥44×44px.

## 2. Home Hero + Component Reflow on Mobile

- `.hero-content` (currently a fixed-height flex row, `height: 392px`) drops the fixed height and switches to a column below 720px, with the 3D card **first**, then intro text/socials/evolution strip below it (per your preference — card above text).
- `.card-3d-wrapper`'s `--card-width`/`--card-height` custom properties change from fixed `280px`/`392px` to `min(280px, 78vw)` / a proportional height (`calc(var(--card-width) * 1.4)`, preserving the 280:392 aspect ratio), so the card scales down and stays centered on narrow viewports instead of overflowing. `.card-3d-container` and the card face/side elements already reference these custom properties, so no further changes are needed there.
- `.urdf-viewer-canvas` inside the rover project's dropdown (`.rover-dropdown-viewer .urdf-viewer-canvas`, currently 400px) drops to ~260px inside the existing `@media (max-width: 700px)` block that already collapses `.rover-dropdown-content` to one column. `URDFViewer.tsx` already has a `ResizeObserver` keeping the Three.js camera/renderer in sync with container size, so this is a pure CSS change.
- The Pokémon card drag (`Card3D.tsx`) already has working touch listeners (`touchstart`/`touchmove` with correct `preventDefault`/passive flags) — confirmed by reading the component — so no code change is needed there, only the sizing above. The URDF viewer's `OrbitControls` (three.js) support touch natively (one-finger orbit, two-finger pinch/pan) with no extra wiring required.
- `.gh-dropdown-content` (640px breakpoint) and `.rover-dropdown-content` (700px breakpoint) already collapse to one column correctly — verified by reading `App.css`; no change, just confirm at 375px during testing.

## 3. Visual Consistency Pass (scoped)

- **Spacing:** audit ad hoc one-off values in shell/chrome CSS (e.g. sidebar gaps, card padding) against a simple 4/8px rhythm; round outliers to the nearest step. Not a full retokenization of every component — focused on places where inconsistency is visible side-by-side (sidebar nav, cards, list rows).
- **Type scale:** heading sizes currently jump 50→48→36→30→26→22px with no consistent ratio (`profile-name`, `block-heading`, `section-title`, `rover-step-title` [dead-code page, skip], `resume-section h3`, `modal-title`). Rationalize to a smaller set of steps reused across headings of the same semantic level.
- **Buttons/cards:** unify border/radius/hover treatment across `.home-actions button`, `.evolution-chip`, `.gh-card`, `.stat-card` so hover/press feedback feels like one system instead of several slightly different ones.
- **Touch targets:** confirm/adjust sidebar nav buttons, the collapse and theme toggles, and list-item rows are all ≥44×44px — this matters more now that a drawer/header full of tap targets exists on mobile.
- **Contrast:** bump `--text-subtle` → `--text-muted` on a few selectors that carry real information rather than pure decoration (e.g. `.item-year`/`.skills`/`.detail-location`), consistent with WCAG AA guidance, in both themes.
- No new color tokens, no site-wide spacing retokenization, no new fonts — this is a targeted cleanup of chrome/contrast/rhythm inconsistencies, not a rewrite of `App.css`.

## Testing

No automated test suite exists in this project (`package.json` only has `dev`/`build`/`lint`/`preview`/`deploy`). Verification is `npm run build` (type-checks via `tsc -b`), `npm run lint`, and manual browser check via `npm run dev`:

- 375px, 390px, 768px, and desktop (~1280px) widths.
- Light and dark theme.
- Confirm: mobile header + drawer appear/disappear at the right breakpoint (860px), drawer opens/closes via hamburger/backdrop/close button/nav-item tap, body scroll locks while open, desktop sidebar collapse/expand still works unchanged above 860px, scroll-to-section works from both surfaces, no horizontal scroll at any width, 3D card and URDF viewer scale down without overflowing and remain drag/touch-interactive, no console errors.

## Files Touched (expected)

- New: `src/components/MobileHeader.tsx`, `src/components/NavDrawer.tsx`
- Modify: `src/App.tsx` (render the two new components), `src/App.css` (breakpoint rework, new component styles, hero/card/URDF responsive fixes, consistency-pass tweaks)
- No change expected to `Sidebar.tsx`, `useTheme.ts`, `Card3D.tsx`, or `URDFViewer.tsx` logic.
