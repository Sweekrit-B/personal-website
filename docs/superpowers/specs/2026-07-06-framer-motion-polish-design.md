# Framer Motion Scroll-Reveal + Hover/Tap Polish — Design

Date: 2026-07-06

## Goal

The site (React + Vite + TS, single-scroll portfolio) currently has only a handful of bespoke CSS keyframe animations (`pageIn`, `popIn`, `fadeIn`, the skeleton shimmer, the stat-arc entrance) and plain CSS `transform`/`transition` hover effects scattered across several components with slightly different timing/easing. This pass adds a small, consistent Framer Motion layer on top of the existing (now-responsive, per the mobile-topbar-drawer-polish work) layout:

1. A scroll-reveal system: content fades + slides up once as it scrolls into view, with list rows staggering in.
2. A shared hover/tap "feel" for interactive elements (nav buttons, list rows, evolution chips), replacing today's several slightly different CSS transitions with one spring.
3. Both respect `prefers-reduced-motion`, matching the pattern already used for the existing `.stat-arc--*` entrance animation in `App.css`.

Explicitly out of scope: the mobile nav drawer's open/close animation (stays CSS — it already works and isn't part of this pass), `Card3D`'s custom drag/rotation/momentum system (bespoke physics, not a hover/tap effect — touching it risks breaking the drag feel), and the URDF 3D viewer (three.js, unrelated to Framer Motion). No new color tokens, no layout changes — this is purely additive motion on existing, already-responsive markup.

## 1. Scroll-Reveal System

- Add `framer-motion` as a dependency (`npm install framer-motion`).
- New component `src/components/Reveal.tsx`, exporting three thin wrappers around `motion.div`/`motion.ul`/`motion.li`/`motion.section`:
  - `Reveal` — single fade+slide-up block: `initial={{opacity: 0, y: 12}}`, `whileInView={{opacity: 1, y: 0}}`, `viewport={{once: true, margin: '-80px'}}`, `transition={{duration: 0.4, ease: 'easeOut'}}`.
  - `RevealGroup` — wraps a list container; direct `RevealItem` children stagger in via a `staggerChildren: 0.05` variant once the group scrolls into view.
  - `RevealItem` — a single staggered item, used inside a `RevealGroup`.
  - All three accept `{ children, className?, as?, id? }` (`as` defaults to `'div'`; `id` passes through so scroll-anchor ids like `#projects`/`#resume` can live directly on the animated element).
  - All three call `useReducedMotion()` and render a plain, non-motion element with no animation props when it's `true` — full opacity, no transform, matching the existing `@media (prefers-reduced-motion: reduce)` handling for `.stat-arc--*`.
- Applied to:
  - The hero's `.profile-intro` block (`src/pages/Home.tsx`), wrapped in `Reveal`.
  - The Projects and Resume `section-wrapper` divs (`src/pages/Home.tsx`), each wrapped in `Reveal` with the `id="projects"`/`id="resume"` anchors moved onto the `Reveal` element itself (no behavior change — `scrollIntoView` and the `.section-wrapper` class's `scroll-margin-top` still target/apply to the same element).
  - The project list (`src/pages/Projects.tsx`): `<ul className="list">` becomes `<RevealGroup as="ul" className="list">`, each `<li className="list-item">` becomes `<RevealItem as="li" className="list-item">`.
  - The resume experience list (`src/pages/Resume.tsx`): same pattern as the project list.

## 2. Hover/Tap Feel

- One shared spring across all converted elements: `whileTap={{ scale: 0.94–0.98 }}` (exact value per element below), and where applicable `whileHover`, using Framer Motion's default spring tuned via `type: 'spring', stiffness: 400, damping: 25` (set once via a `transition` prop or a shared variant, not repeated ad hoc per element).
- Converted elements:
  - Desktop sidebar nav buttons (`src/components/Sidebar.tsx`): `whileHover={{ x: 2 }}` (replacing the existing `.sidebar-nav button:hover { transform: translateX(1px) }` CSS rule, which is removed from `App.css` since Framer Motion now owns this element's hover motion).
  - Mobile drawer nav buttons (`src/components/NavDrawer.tsx`): `whileTap={{ scale: 0.96 }}` (these are primarily touch targets — tap feedback matters more than hover here; no hover effect added).
  - Project and resume list-item buttons (`src/pages/Projects.tsx`, `src/pages/Resume.tsx`): `whileHover={{ scale: 1.005 }}`, `whileTap={{ scale: 0.995 }}` — intentionally tiny since these are full-width rows, not small chips/buttons; a large scale would look like a layout jump.
  - Pokémon evolution chips (`src/pages/Home.tsx`): `whileHover={{ scale: 1.08 }}`, `whileTap={{ scale: 0.94 }}` (replacing the existing `.evolution-chip` CSS `scale`/`transform` transition properties, which are removed from that rule since Framer Motion now owns them; the border-color/background-color transitions stay in CSS since Framer Motion isn't managing those).
- Every one of these elements is a real `<button>` today and stays a real `<button>` (via `motion.button`) — no `<div onClick>` patterns introduced.

## Testing

No automated test suite exists in this project (`package.json` only has `dev`/`build`/`lint`/`preview`/`deploy`). Verification is `npm run build` (type-checks via `tsc -b`) and `npm run lint`. Per prior feedback, **do not use `/browse` or any headless-browser automation for this project** — it noticeably slows the user's machine. Visual/interactive confirmation (scroll-reveal firing once, stagger timing, hover/tap feel, `prefers-reduced-motion` behavior) is verified by reading the implementation against Framer Motion's documented API behavior, not by driving a live browser. If a live look is wanted, the user runs `npm run dev` themselves.

## Files Touched (expected)

- New: `src/components/Reveal.tsx`
- Modify: `package.json`, `package-lock.json` (via `npm install framer-motion`), `src/pages/Home.tsx`, `src/pages/Projects.tsx`, `src/pages/Resume.tsx`, `src/components/Sidebar.tsx`, `src/components/NavDrawer.tsx`, `src/App.css` (remove the CSS transition properties now superseded by Framer Motion on `.sidebar-nav button:hover` and `.evolution-chip`)
- No change expected to `src/App.tsx`, `src/components/MobileHeader.tsx`, `src/components/Card3D.tsx`, `src/components/URDFViewer.tsx`, or `src/hooks/useTheme.ts`.
