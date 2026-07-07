# Mobile Top-Bar + Drawer Nav, Hero Reflow, and Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the currently-broken mobile sidebar (icon rail with invisible nav labels below 980px) with a top bar + slide-out drawer, fix responsive sizing on the hero/3D-card/URDF-viewer so nothing overflows on small screens, and do a scoped CSS consistency pass — no new color palette, no animation library.

**Architecture:** Two new presentational components, `MobileHeader` and `NavDrawer`, render unconditionally from `App.tsx` and are shown only below 860px via CSS (mirroring how the existing sidebar is hidden above that width). Both reuse the `theme`/`onToggleTheme` props `App.tsx` already gets from the shared `useTheme` hook (committed in a prior session) — no new theme state. Drawer open/close is a single boolean owned by `App.tsx`, passed down as props; no new hook needed for state this small. All hero/3D-card/URDF-viewer/consistency work is CSS-only in `src/App.css`, using CSS custom properties and media queries already established in the file (720px, 700px, 640px breakpoints already exist and are reused; 860px is new, replacing the old 980px icon-rail breakpoint).

**Tech Stack:** React 19 + TypeScript + Vite, react-router-dom, plain CSS (custom properties, no CSS-in-JS). No new dependencies.

## Global Constraints

- This repo has no test runner (no vitest/jest — `package.json` only has `dev`, `build`, `lint`, `preview`, `deploy`). Every task's verification is `npm run build` (runs `tsc -b` then `vite build`, catches type errors), `npm run lint`, and a manual browser check via `npm run dev` — not automated unit tests.
- Do not modify `src/pages/RoverShowcase.tsx` — it is not imported or routed anywhere in `App.tsx`, so it's dead code. Classes like `.rover-step-card`/`.rover-step-number`/`.rover-step-kicker` only style that dead file; don't touch them under the guise of "consistency."
- Do not add any animation/motion library (no Framer Motion) and no new color tokens/fonts — this plan is nav + responsive-sizing + a scoped CSS consistency pass only.
- Every new tap target (hamburger, drawer close, drawer nav items, mobile header theme toggle) must be ≥44×44px.
- Do not change desktop sidebar behavior/layout above the 860px breakpoint introduced in Task 1.
- Run all commands from `C:\Users\sweek\Downloads\projects\personal-website-all\personal-website`.

---

### Task 1: Mobile header + slide-out nav drawer

**Files:**
- Create: `src/components/MobileHeader.tsx`
- Create: `src/components/NavDrawer.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `Theme` type and `theme`/`toggleTheme` values from `src/hooks/useTheme.ts` (already exists, committed).
- Produces: `MobileHeader({ theme, onToggleTheme, onOpenDrawer }: { theme: Theme; onToggleTheme: () => void; onOpenDrawer: () => void })` default export. `NavDrawer({ open, onClose }: { open: boolean; onClose: () => void })` default export. Neither is consumed by any later task in this plan, but both must keep these exact prop names/types since they're referenced together in `App.tsx` in this same task.

- [ ] **Step 1: Create `MobileHeader.tsx`**

Create `src/components/MobileHeader.tsx`:

```tsx
import type { Theme } from '../hooks/useTheme'

type MobileHeaderProps = {
  theme: Theme
  onToggleTheme: () => void
  onOpenDrawer: () => void
}

export default function MobileHeader({ theme, onToggleTheme, onOpenDrawer }: MobileHeaderProps) {
  return (
    <header className="mobile-header">
      <button
        className="mobile-header-menu"
        onClick={onOpenDrawer}
        aria-label="Open navigation menu"
      >
        <span className="mobile-header-menu-icon" aria-hidden="true">☰</span>
      </button>

      <span className="mobile-header-title">Sweekrit Bhatnagar</span>

      <button
        className={`theme-toggle ${theme}`}
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span className="theme-toggle-icon" aria-hidden="true">
          {theme === 'dark' ? '✦' : '✧'}
        </span>
      </button>
    </header>
  )
}
```

- [ ] **Step 2: Create `NavDrawer.tsx`**

Create `src/components/NavDrawer.tsx`:

```tsx
type NavDrawerProps = {
  open: boolean
  onClose: () => void
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const go = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <>
      <div
        className={`nav-drawer-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`nav-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="nav-drawer-header">
          <button
            className="nav-drawer-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav className="nav-drawer-nav">
          <button
            onClick={() => go(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            aria-label="Scroll to home"
          >
            Home
          </button>
          <button
            onClick={() => go(() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to projects"
          >
            Projects
          </button>
          <button
            onClick={() => go(() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to resume"
          >
            Resume
          </button>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </aside>
    </>
  )
}
```

- [ ] **Step 3: Wire both components into `App.tsx` with drawer-open state and a body-scroll lock**

Replace the full contents of `src/App.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import NavDrawer from './components/NavDrawer'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Resume from './pages/Resume'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className="site-root">
      <MobileHeader theme={theme} onToggleTheme={toggleTheme} onOpenDrawer={() => setDrawerOpen(true)} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />

        <div className="content-area">
          <main className="site-main">
            <Routes>
              <Route path="/" element={<Home onNavigate={(p: any) => navigate(p === 'home' ? '/' : `/${p}`)} />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/resume" element={<Resume />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Replace the old icon-rail breakpoint in `App.css` with the sidebar-hide + mobile-header-show breakpoint**

In `src/App.css`, find this existing block (around line 1708):

```css
@media (max-width: 980px) {
  .app-layout {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .sidebar {
    width: 72px;
  }

  .brand,
  .nav-label,
  .sidebar-footer {
    display: none;
  }

  .site-main {
    padding: 28px 18px 40px;
  }

  .subtitle {
    font-size: 18px;
  }

  .profile-name {
    font-size: 40px;
  }

  .profile-intro p {
    font-size: clamp(20px, 5.2vw, 25px);
  }

  .block-heading {
    font-size: 30px;
  }

  .recent-project-title {
    font-size: 18px;
  }

  .modal-title {
    font-size: 22px;
  }
}
```

Replace it with:

```css
@media (max-width: 860px) {
  .sidebar {
    display: none;
  }

  .app-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .mobile-header {
    display: flex;
  }

  .site-main {
    padding: calc(28px + 52px + env(safe-area-inset-top)) 18px 40px;
  }

  .subtitle {
    font-size: 18px;
  }

  .profile-name {
    font-size: 40px;
  }

  .profile-intro p {
    font-size: clamp(20px, 5.2vw, 25px);
  }

  .block-heading {
    font-size: 30px;
  }

  .recent-project-title {
    font-size: 18px;
  }

  .modal-title {
    font-size: 22px;
  }
}
```

(This drops the old icon-rail-specific rules — `.app-layout` grid change to `72px`, `.sidebar` width, hiding `.brand`/`.nav-label`/`.sidebar-footer` — since the sidebar is now fully hidden below 860px instead of shrinking to an icon rail. The typography-scaling rules are kept, just moved to the new breakpoint value.)

- [ ] **Step 5: Add styles for `MobileHeader` and `NavDrawer`**

Add this new block to `src/App.css`, anywhere after the `.sidebar-footer` rule (e.g. right after the sidebar-related rules, before `.content-area`):

```css
/* ── Mobile header ───────────────────────────────────────── */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 52px;
  padding: env(safe-area-inset-top) 8px 0 8px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}

.mobile-header-menu {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-header-menu-icon {
  font-size: 22px;
  line-height: 1;
}

.mobile-header-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.mobile-header .theme-toggle {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

/* ── Nav drawer ──────────────────────────────────────────── */
.nav-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.nav-drawer-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

.nav-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 70;
  width: min(280px, 78vw);
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: calc(12px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));
  transform: translateX(-100%);
  transition: transform 220ms ease;
}

.nav-drawer.open {
  transform: translateX(0);
}

.nav-drawer-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.nav-drawer-close {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-drawer-close:hover {
  color: var(--text);
}

.nav-drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-drawer-nav button {
  width: 100%;
  min-height: 44px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding-block: 10px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: color 140ms ease;
}

.nav-drawer-nav button:hover {
  color: var(--text);
}
```

- [ ] **Step 6: Verify types and build**

Run: `npm run build`
Expected: Completes with no TypeScript errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, open devtools, toggle device toolbar to 375px width.
- Confirm the desktop sidebar disappears and a top bar (hamburger, site name, theme toggle) appears, fixed to the top.
- Tap the hamburger; confirm a drawer slides in from the left over a dimmed backdrop, and page scroll is locked while it's open.
- Tap each of Home/Projects/Resume in the drawer; confirm it scrolls to the right section and the drawer closes.
- Reopen the drawer and tap the backdrop; confirm it closes. Reopen and tap the ✕; confirm it closes.
- Tap the theme toggle in the mobile header; confirm the whole page switches dark/light (same as the desktop toggle).
- Widen the viewport back past 860px; confirm the sidebar reappears (with working collapse toggle), the mobile header disappears, and desktop layout looks unchanged from before this task.
- Confirm no horizontal scrollbar appears at 375px.

- [ ] **Step 8: Commit**

```bash
git add src/components/MobileHeader.tsx src/components/NavDrawer.tsx src/App.tsx src/App.css
git commit -m "feat: add mobile top bar + slide-out nav drawer, replacing icon-rail sidebar collapse"
```

---

### Task 2: Responsive hero and 3D card

**Files:**
- Modify: `src/App.css`

**Interfaces:** None (CSS-only; `Card3D.tsx` already reads `--card-width`/`--card-height` custom properties and already has working touch-drag listeners — no component code changes needed).

- [ ] **Step 1: Drop the hero's fixed height**

In `src/App.css`, find:

```css
.hero-content {
  margin-top: 40px;
  display: flex;
  gap: 32px;
  align-items: flex-start;
  height: 392px;
}
```

Replace with:

```css
.hero-content {
  margin-top: 40px;
  display: flex;
  gap: 32px;
  align-items: flex-start;
}
```

- [ ] **Step 2: Make the 3D card fluid instead of fixed 280×392, and center it when wrapped**

In `src/App.css`, find:

```css
.card-3d-wrapper {
  --card-width: 280px;
  --card-height: 392px;
  --card-depth: 6px;
  flex-shrink: 0;
  margin: 0;
}
```

Replace with:

```css
.card-3d-wrapper {
  --card-width: min(280px, 78vw);
  --card-height: calc(var(--card-width) * 1.4);
  --card-depth: 6px;
  flex-shrink: 0;
  margin: 0 auto;
}
```

(`392 / 280 = 1.4`, preserving the original aspect ratio. `.card-3d-container`, `.card-3d-content`, `.card-side`, `.card-left`, `.card-right` already reference `var(--card-width)`/`var(--card-height)`/`var(--card-depth)` — confirmed by reading the current file — so they scale automatically with no further edits.)

- [ ] **Step 3: Stack the hero on narrow screens, card first**

In `src/App.css`, find the existing block:

```css
@media (max-width: 720px) {
  .project-stats {
    grid-template-columns: 1fr;
  }
}
```

Replace with:

```css
@media (max-width: 720px) {
  .project-stats {
    grid-template-columns: 1fr;
  }

  .hero-content {
    flex-direction: column;
    align-items: center;
  }
}
```

(`.hero-content`'s DOM order in `src/pages/Home.tsx` already renders `.profile-intro` before `Card3D`, so a plain `flex-direction: column` would put text first. Per the design, the card should come first on mobile — Step 4 handles that via DOM order, since CSS `column-reverse` would also reverse tab order, which is worse for keyboard/screen-reader users than reordering the JSX itself.)

- [ ] **Step 4: Reorder the hero JSX so the 3D card renders before the intro text**

Read `src/pages/Home.tsx`. Find the `.hero-content` block (the `<div className="hero-content">` containing `.profile-intro` followed by `<Card3D ... />`):

```tsx
          <div className="hero-content">
            <div className="profile-intro">
              <p>
                I am a data science student at UCSD committed to leveraging data
                driven insights and delivering full stack AI-integrated software
                solutions. I have experience spanning healthcare, analytics,
                computational research, and software engineering. I learn fast,
                collaborate effectively, and apply innovative solutions to real
                problems.
              </p>
              <div className="social-row" aria-label="Social links">
                <a href="https://www.linkedin.com/in/sweekrit-bhatnagar/" target="_blank" rel="noreferrer">LinkedIn</a>
                <a href="https://github.com/Sweekrit-B/" target="_blank" rel="noreferrer">GitHub</a>
                <a href="mailto:sweekritbh@gmail.com" target="_blank" rel="noreferrer">Email</a>
                <a href="https://www.instagram.com/sweekritbhatnagar/" target="_blank" rel="noreferrer">Instagram</a>
              </div>

              <div className="evolution-row" aria-label="Pokemon selectors">
                {pokemonNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`evolution-chip${selectedCardName === name ? ' active' : ''}`}
                    onClick={() => setSelectedCardName(name)}
                    aria-label={`Show ${name} card`}
                    aria-pressed={selectedCardName === name}
                  >
                    <img src={`${import.meta.env.BASE_URL}gifs/${name}.gif`} alt={name} />
                  </button>
                ))}
              </div>
            </div>
            <Card3D cardImageName={selectedCardName} />
          </div>
```

Replace with (only the order of the two direct children of `.hero-content` changes — `Card3D` first, `.profile-intro` second — nothing inside either block changes):

```tsx
          <div className="hero-content">
            <Card3D cardImageName={selectedCardName} />
            <div className="profile-intro">
              <p>
                I am a data science student at UCSD committed to leveraging data
                driven insights and delivering full stack AI-integrated software
                solutions. I have experience spanning healthcare, analytics,
                computational research, and software engineering. I learn fast,
                collaborate effectively, and apply innovative solutions to real
                problems.
              </p>
              <div className="social-row" aria-label="Social links">
                <a href="https://www.linkedin.com/in/sweekrit-bhatnagar/" target="_blank" rel="noreferrer">LinkedIn</a>
                <a href="https://github.com/Sweekrit-B/" target="_blank" rel="noreferrer">GitHub</a>
                <a href="mailto:sweekritbh@gmail.com" target="_blank" rel="noreferrer">Email</a>
                <a href="https://www.instagram.com/sweekritbhatnagar/" target="_blank" rel="noreferrer">Instagram</a>
              </div>

              <div className="evolution-row" aria-label="Pokemon selectors">
                {pokemonNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`evolution-chip${selectedCardName === name ? ' active' : ''}`}
                    onClick={() => setSelectedCardName(name)}
                    aria-label={`Show ${name} card`}
                    aria-pressed={selectedCardName === name}
                  >
                    <img src={`${import.meta.env.BASE_URL}gifs/${name}.gif`} alt={name} />
                  </button>
                ))}
              </div>
            </div>
          </div>
```

- [ ] **Step 5: Verify types and build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open devtools device toolbar at 375px width.
- Confirm the 3D card renders above the intro text, centered, and doesn't overflow horizontally (no horizontal scrollbar).
- Drag/rotate the 3D card at this width; confirm it still responds to touch drag.
- Widen back to desktop width (~1280px); confirm the hero looks identical to before this task (card on the right, text on the left, 280×392 card).

- [ ] **Step 7: Commit**

```bash
git add src/App.css src/pages/Home.tsx
git commit -m "fix: make hero layout and 3D card responsive, card-first on mobile"
```

---

### Task 3: Responsive URDF viewer

**Files:**
- Modify: `src/App.css`

**Interfaces:** None (CSS-only; `URDFViewer.tsx` already has a `ResizeObserver` that keeps the Three.js camera/renderer in sync with its container size, and its `OrbitControls` already support touch natively — confirmed by reading the component).

- [ ] **Step 1: Shrink the URDF viewer canvas inside the rover dropdown on narrow screens**

In `src/App.css`, find the existing block:

```css
@media (max-width: 700px) {
  .rover-dropdown-content {
    grid-template-columns: 1fr;
  }
}
```

Replace with:

```css
@media (max-width: 700px) {
  .rover-dropdown-content {
    grid-template-columns: 1fr;
  }

  .rover-dropdown-viewer .urdf-viewer-canvas {
    height: 260px;
  }
}
```

- [ ] **Step 2: Verify types and build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open devtools device toolbar at 375px width.
- On the Projects page, open the rover project's dropdown.
- Confirm the URDF 3D viewer fits within the column without overflow and is noticeably shorter than the desktop version.
- Drag to orbit and pinch (or use the mouse wheel in emulation) to zoom; confirm it still responds.
- Widen back to desktop width (~1280px); confirm the viewer returns to its original 400px height.

- [ ] **Step 4: Commit**

```bash
git add src/App.css
git commit -m "fix: shrink URDF viewer canvas on narrow screens"
```

---

### Task 4: Visual consistency pass

**Files:**
- Modify: `src/App.css`

**Interfaces:** None (CSS-only, no component signatures change).

- [ ] **Step 1: Bump contrast on three low-contrast selectors that carry real information**

In `src/App.css`, find:

```css
.item-right {
  color: var(--text-subtle);
  font-size: 13px;
  font-weight: 560;
  margin-left: 14px;
  white-space: nowrap;
  transition: color 140ms ease;
}
```

Replace with:

```css
.item-right {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 560;
  margin-left: 14px;
  white-space: nowrap;
  transition: color 140ms ease;
}
```

Then find:

```css
.skills {
  color: var(--text-subtle);
  font-size: 14px;
  margin: 0;
}
```

Replace with:

```css
.skills {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0;
}
```

Then find:

```css
.detail-location {
  color: var(--text-subtle);
  font-size: 14px;
  font-weight: 560;
  margin-bottom: 10px;
}
```

Replace with:

```css
.detail-location {
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 560;
  margin-bottom: 10px;
}
```

(Leave the `[data-theme='light'] .detail-location` entry in the existing light-theme override list untouched — it already hardcodes the equivalent muted color for light mode, so it's now redundant but harmless.)

- [ ] **Step 2: Rationalize heading sizes to three consistent steps**

Headings currently jump 50→48→36→26→22px with no consistent ratio (`.profile-name`, `.block-heading`, `.section-title`, `.resume-section h3`, `.modal-title`; `.rover-step-title` is excluded — it only styles the dead-code `RoverShowcase.tsx`). Consolidate to three steps: 48px (hero name), 32px (section-level headings), 22px (sub-section/dialog headings).

In `src/App.css`, find:

```css
.profile-name {
  margin: 18px 0 10px;
  font-size: 50px;
  line-height: 1.06;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: #f9fafb;
}
```

Replace the `font-size: 50px;` line with `font-size: 48px;`.

Then find:

```css
.block-heading {
  margin: 0;
  font-size: 48px;
  line-height: 1.2;
  padding-block: 12px;
  font-weight: 800;
}
```

Replace the `font-size: 48px;` line with `font-size: 32px;`.

Then find:

```css
.section-title {
  margin: 0 0 16px;
  font-size: 36px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text);
}
```

Replace the `font-size: 36px;` line with `font-size: 32px;`.

Then find:

```css
.resume-section h3 {
  margin: 0 0 16px;
  font-size: 26px;
  color: var(--text-muted);
  font-weight: 700;
  letter-spacing: -0.01em;
}
```

Replace the `font-size: 26px;` line with `font-size: 22px;`.

(`.modal-title` is already `22px` — matches the new third step, no change needed there.)

- [ ] **Step 3: Rationalize the sidebar nav type scale and spacing (currently oversized for a 3-item list)**

In `src/App.css`, find:

```css
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-top: 6px;
}
```

Replace with:

```css
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 6px;
}
```

Then find:

```css
.sidebar-nav button {
  text-decoration: none;
  color: var(--text-muted);
  border-radius: 0;
  padding: 0;
  font-size: 32px;
  line-height: 1.24;
  padding-block: 8px;
  font-weight: 700;
  letter-spacing: -0.03em;
  transition: color 140ms ease, transform 140ms ease;
  display: block;
  background: transparent;
  width: fit-content;
  border: none;
  cursor: pointer;
}
```

Replace with:

```css
.sidebar-nav button {
  text-decoration: none;
  color: var(--text-muted);
  border-radius: 0;
  padding: 0;
  font-size: 24px;
  line-height: 1.24;
  padding-block: 8px;
  font-weight: 700;
  letter-spacing: -0.03em;
  transition: color 140ms ease, transform 140ms ease;
  display: block;
  background: transparent;
  width: fit-content;
  border: none;
  cursor: pointer;
}
```

(This brings the desktop sidebar's nav font size down from 32px to 24px — closer to `.nav-drawer-nav button`'s 24px from Task 1, so desktop and mobile nav read as one consistent system instead of two different scales.)

- [ ] **Step 4: Unify hover-state chrome between `.evolution-chip` and `.home-actions button`**

In `src/App.css`, find:

```css
.home-actions button {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 10px 15px;
  font-size: 15px;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}
```

Confirm `--radius-sm` (`8px`, defined in `:root` at the top of `App.css`) is also used by `.evolution-chip`'s border-radius. Find:

```css
.evolution-chip {
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease, scale 140ms ease;
  scale: 1;
  position: relative;
}
```

Replace the `border-radius: 10px;` line with `border-radius: var(--radius-sm);` so both share the same 8px radius token instead of one using a bespoke `10px`:

```css
.evolution-chip {
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 4px;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease, scale 140ms ease;
  scale: 1;
  position: relative;
}
```

- [ ] **Step 5: Verify types and build**

Run: `npm run build`
Expected: No errors (CSS-only change, but confirms nothing else broke).

- [ ] **Step 6: Manual verification**

Run: `npm run dev`.
- Check the sidebar: nav items should feel proportionate (not oversized) next to the tighter vertical spacing, in both light and dark theme.
- Confirm heading sizes read as one consistent scale: the hero name is the single largest heading; "Projects"/"Resume"/"Recent projects" headings match each other; the resume sub-section ("Education"/"Experience") headings match the modal title size.
- Open a project row and a resume row; confirm the year/date, skills line, and (for resume) location text are a bit more readable than before, in both themes.
- Confirm the Pokémon evolution chips' corner radius now visually matches the home hero action buttons' corner radius.

- [ ] **Step 7: Commit**

```bash
git add src/App.css
git commit -m "style: rationalize heading scale, sidebar nav scale, contrast, and shared radius token"
```

---

### Task 5: Final cross-browser QA pass

**Files:** None expected (fix-up only, if QA finds issues).

- [ ] **Step 1: Full build and lint**

Run: `npm run build`
Expected: No errors.

Run: `npm run lint`
Expected: No errors (fix any that appear before proceeding).

- [ ] **Step 2: Manual QA matrix**

Run: `npm run dev`. For each of 375px, 390px, 768px, and ~1280px viewport widths, in both light and dark theme (toggle via either theme button):

- No horizontal scroll at any width.
- Every mobile tap target (hamburger, drawer close, drawer nav items, mobile header theme toggle) is comfortably ≥44×44px — check via devtools element box sizes at 375px.
- Mobile header + drawer present only at ≤860px; desktop sidebar (with working collapse toggle) present only above that.
- Drawer opens via hamburger, closes via backdrop tap, ✕ button, and nav-item tap; body scroll is locked while open and restored on close.
- Scroll-to-section works identically from the desktop sidebar and the mobile drawer.
- Hero (card-first order on mobile, side-by-side on desktop), 3D card drag (mouse and touch emulation), project stats, project list, resume stats, resume list, rover dropdown (with the shrunk 3D viewer), and any modal all render without visual overflow or clipping.
- No console errors or warnings at any width/theme combination.

- [ ] **Step 3: Fix any issues found**

If QA in Step 2 surfaces an issue, fix it directly in the relevant file from earlier tasks, re-run Step 1, and re-check the specific case that failed.

- [ ] **Step 4: Final commit (only if Step 3 produced changes)**

```bash
git add -A
git commit -m "fix: address issues found in final responsive/nav QA pass"
```

If Step 3 produced no changes, skip this commit — there's nothing to commit.
