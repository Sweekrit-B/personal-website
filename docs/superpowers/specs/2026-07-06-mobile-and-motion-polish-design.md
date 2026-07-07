> **Superseded 2026-07-06.** Replaced by [2026-07-06-mobile-topbar-drawer-polish-design.md](2026-07-06-mobile-topbar-drawer-polish-design.md), which uses a top-bar + slide-out drawer for mobile nav instead of the bottom tab bar below, and drops the Framer Motion animation system. Only Task 1 of the matching plan (the `useTheme` hook refactor) was ever executed; it has been committed and carries forward unchanged.

# Mobile Nav + Motion + Visual Polish — Design

Date: 2026-07-06

## Goal

The site (React + Vite + TS, single-scroll portfolio with a fixed left sidebar) currently "handles mobile" by shrinking the sidebar to a 72px icon-only rail with no labels, and has only a handful of bespoke CSS keyframe animations (pageIn, popIn, fadeIn, shimmer, stat arc-in). This pass:

1. Replaces the mobile sidebar behavior with a proper bottom tab bar.
2. Adds a consistent, subtle scroll-reveal + micro-interaction motion system via Framer Motion.
3. Does a scoped visual decluttering pass (chrome/elevation/spacing consistency, not a full retokenization).
4. Fixes responsive sizing on a few components that currently use fixed pixel dimensions that don't scale to small screens.

Explicitly out of scope: redesigning the internal structure/visuals of the rover timeline, GitHub card, project stat charts, 3D card, or resume list — those keep their current layout and just become responsive + animated.

## 1. Mobile Navigation

- New component `src/components/BottomNav.tsx`, rendered from `App.tsx` alongside `Sidebar`, visibility controlled by CSS (`display: none` above 768px, `display: flex` at/below).
- Fixed to the bottom of the viewport, `padding-bottom: env(safe-area-inset-bottom)`, height ~56px + safe area.
- Three items — Home / Projects / Resume — plus a compact theme toggle, each a real button ≥44×44pt tap target with icon + label (per the sidebar's existing `nav-label` text, just always visible instead of hidden in collapsed mode).
- Reuses the exact same navigation behavior as the sidebar today: `scrollTo({top: 0})` for Home, `getElementById('projects')?.scrollIntoView(...)` / `getElementById('resume')?.scrollIntoView(...)` for the others. No routing changes.
- Active-section highlighting via a single `IntersectionObserver` watching the hero container plus `#projects` and `#resume`, lifted into a small shared hook (`useActiveSection`) so both `Sidebar` and `BottomNav` could use it (Sidebar doesn't currently highlight active state — adding it there is a nice-to-have, not required).
- Desktop sidebar (`Sidebar.tsx`) is unchanged in its own breakpoint range; the existing `@media (max-width: 980px)` icon-rail-collapse rule is removed and replaced with "hide sidebar entirely, show BottomNav" at `768px`. Between 768–980px the sidebar keeps full labels (there's enough room) — this shrinks the "cramped icon rail" zone to nothing.
- `.content-area` / `.site-main` gets `padding-bottom` added at the BottomNav breakpoint so content isn't hidden behind the fixed bar (per `fixed-element-offset` guidance).

## 2. Scroll Animation System

- Add `framer-motion` as a dependency.
- New component `src/components/Reveal.tsx`: thin wrapper using `motion.div` with `initial={{opacity: 0, y: 12}}`, `whileInView={{opacity: 1, y: 0}}`, `viewport={{once: true, margin: "-80px"}}`, `transition={{duration: 0.4, ease: "easeOut"}}`. Internally calls `useReducedMotion()` and if true, renders a plain `<div>` with no animation props (full opacity, no transform) — satisfies `reduced-motion`/`animation-optional` guidance.
- Applied to: hero intro block, the `section-wrapper` around Projects and Resume, and — via a `staggerChildren` variant on the parent list (`Reveal.List` / a `stagger` prop) — the recent-projects list rows, resume experience rows, and rover timeline steps (30–50ms stagger per item, one-time trigger).
- Hover/press states: nav buttons, list item rows, evolution chips, and cards move from plain CSS `transition: transform` to Framer Motion `whileHover={{scale: 1.02}}` / `whileTap={{scale: 0.98}}` where they're already interactive buttons, so all interactive elements share one spring feel (`type: "spring", stiffness: 400, damping: 25`). Elements that aren't real buttons (e.g. decorative arcs) are untouched.
- Existing bespoke CSS animations (shimmer skeleton, stat arc-in stagger, modal popIn/fadeIn) are left as-is; they're already correct and don't need Framer Motion.

## 3. Visual Decluttering (scoped)

- Single elevation convention: `--shadow-lg` removed from `.rover-step-card`, `.gh-card`, `.stat-card`, `.paper-preview`, `.urdf-viewer` (all in-flow cards get border-only). Kept on `.card-3d-content`, `.modal` (things that visually float above the page).
- Unify pill/tag styling: `.rover-step-kicker`, `.gh-topic`, `.rover-step-tag` consolidated into one shared `.tag` class (border + radius + color) reused via additional modifier classes only where a real visual distinction is needed (e.g. count/number badges).
- `.sidebar-nav` gap reduced from `48px` to a value proportional to 3 items (e.g. `20px`) and nav button font-size reduced from `32px` to something like `22–24px` — current size reads as oversized for a 3-item list.
- Contrast audit: `.item-year`, `.recent-project-year`, `.stat-leg-label` currently use `--text-subtle`; bump to `--text-muted` where they carry real information (not pure decoration), keeping `--text-subtle` for genuinely secondary chrome (footer copyright, kicker labels).
- No new color tokens, no site-wide spacing retokenization — this is a targeted cleanup of chrome/contrast/rhythm inconsistencies identified above, not a rewrite of `App.css`.

## 4. Responsive Fixes for Existing Components

- `.hero-content`: remove fixed `height: 392px`; add `flex-wrap: wrap` below `720px` so the 3D card drops below the intro text and centers, instead of forcing a fixed-height row that can clip content.
- `.card-3d-wrapper` / `.card-3d-container` / related `--card-width`/`--card-height` custom properties: change from fixed `280px`/`392px` to `min(280px, 78vw)` / proportional height, so the card scales down on narrow viewports instead of overflowing.
- `.urdf-viewer-canvas` (480px) and `.rover-dropdown-viewer .urdf-viewer-canvas` (400px): add a rule inside the existing `@media (max-width: 700px)` block (which already collapses `.rover-dropdown-content` to one column) to reduce these to ~280px so the 3D viewer doesn't dominate the mobile viewport.
- `.gh-dropdown-content` / `.rover-dropdown-content` single-column collapse at their existing breakpoints: verified correct, no change.
- Evolution-row chips and social-row links: verified already acceptable touch target sizing (48px image + 4px padding ≥44px), no change needed.

## Testing

Manual verification via the dev server (`npm run dev`) in a real browser:
- 375px, 768px, and desktop (~1280px) widths
- Light and dark theme
- With and without `prefers-reduced-motion: reduce` (via devtools emulation)
- Confirm: bottom nav appears/disappears at the right breakpoint, scroll-to-section still works, no horizontal scroll at 375px, 3D card and URDF viewer don't overflow, scroll-reveal animations fire once and respect reduced motion, no console errors.

No automated test suite exists in this project; this is a visual/behavioral change validated by direct browser inspection, not unit tests.
