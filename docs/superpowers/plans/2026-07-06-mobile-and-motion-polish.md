# Mobile Nav + Motion + Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped icon-only mobile sidebar with a real bottom tab bar, add a subtle scroll-reveal + hover/tap motion system via Framer Motion, do a scoped visual-decluttering CSS pass, and fix a few fixed-pixel-dimension components so they don't overflow on small screens.

**Architecture:** Theme state moves from `Sidebar`-local state into a shared `useTheme` hook owned by `App.tsx`, so both `Sidebar` (desktop) and the new `BottomNav` (mobile) can toggle the same theme without desyncing. A new `useActiveSection` hook (IntersectionObserver-based) tells `BottomNav` which section is currently in view. A new `Reveal`/`RevealGroup`/`RevealItem` trio of components wraps existing JSX to add scroll-triggered fade/slide-up and staggered list entrances, no-op'ing under `prefers-reduced-motion`. CSS-only changes handle the bottom-nav layout, the sidebar-hide breakpoint, the decluttering pass, and the fixed-dimension fixes — no component restructuring.

**Tech Stack:** React 19 + TypeScript + Vite, react-router-dom, plain CSS (custom properties, no CSS-in-JS), adding `framer-motion`.

## Global Constraints

- This repo has no test runner (no vitest/jest configured — `package.json` only has `dev`, `build`, `lint`, `preview`, `deploy`). Every task's verification is: `npm run build` (runs `tsc -b` then `vite build` — catches type errors), `npm run lint` (eslint), and a manual browser check via `npm run dev` — not automated unit tests. This matches the spec's own Testing section.
- Do not modify `src/pages/RoverShowcase.tsx` — it is not imported or routed anywhere in `App.tsx` (verified via grep), so it's dead code. Several classes discussed in the design spec (`.rover-step-card`, `.rover-step-number`, `.rover-step-kicker`) only style that dead file — this plan corrects for that where relevant (see Task 4).
- Do not change desktop sidebar behavior/layout above the 768px breakpoint introduced in Task 3.
- All new motion must respect `prefers-reduced-motion` (via Framer Motion's `useReducedMotion()` hook in `Reveal.tsx`, matching the existing `@media (prefers-reduced-motion: reduce)` handling already used for `.stat-arc--*` in `App.css`).
- Every touch target added (BottomNav items) must be ≥44×44px.
- Run all commands from `C:\Users\sweek\Downloads\projects\personal-website-all\personal-website`.

---

### Task 1: Lift theme state into a shared hook

**Files:**
- Create: `src/hooks/useTheme.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Produces: `useTheme(): [theme: 'dark' | 'light', toggleTheme: () => void]` and exported type `Theme = 'dark' | 'light'`, both from `src/hooks/useTheme.ts`. Later tasks (BottomNav in Task 3) import `Theme` from this file.

- [ ] **Step 1: Create the shared theme hook**

Create `src/hooks/useTheme.ts`:

```ts
import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
    const nextTheme = savedTheme ?? (prefersLight ? 'light' : 'dark')
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  return [theme, toggleTheme]
}
```

This is a straight lift of the two `useEffect` blocks currently in `Sidebar.tsx` (lines 16–27), unchanged in behavior.

- [ ] **Step 2: Wire the hook into `App.tsx`**

Modify `src/App.tsx` — replace the full file with:

```tsx
import './App.css'
import Sidebar from './components/Sidebar'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Resume from './pages/Resume'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="site-root">
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

(`BottomNav` is not added here yet — that's Task 3, once it exists.)

- [ ] **Step 3: Update `Sidebar.tsx` to accept theme as props**

Modify `src/components/Sidebar.tsx` — replace the full file with:

```tsx
import { useEffect, useState } from 'react'
import type { Theme } from '../hooks/useTheme'

type SidebarProps = {
  theme: Theme
  onToggleTheme: () => void
}

export default function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    setCollapsed(stored === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside className={"sidebar" + (collapsed ? ' collapsed' : '')}>
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <button
            className="collapse-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <span className="collapse-toggle-icon" aria-hidden="true">
              {collapsed ? '☰' : '✕'}
            </span>
          </button>

          {!collapsed && (
            <button
              className={`theme-toggle ${theme}`}
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === 'dark' ? '✦' : '✧'}
              </span>
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to home"
          >
            <span className="nav-label">Home</span>
          </button>
          <button
            className="nav-button"
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="Scroll to projects"
          >
            <span className="nav-label">Projects</span>
          </button>
          <button
            className="nav-button"
            onClick={() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="Scroll to resume"
          >
            <span className="nav-label">Resume</span>
          </button>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </div>
    </aside>
  )
}
```

(Only the theme state/effects were removed and replaced with props; `collapsed` state and the nav markup are unchanged from the current file.)

- [ ] **Step 4: Verify types and build**

Run: `npm run build`
Expected: Completes with no TypeScript errors (this catches any missed prop-type mismatch between `App.tsx` and `Sidebar.tsx`).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the printed local URL.
- Click the theme toggle in the sidebar; confirm the page switches dark/light.
- Reload the page; confirm the theme persisted (check `localStorage.getItem('theme')` in devtools console).
- Confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTheme.ts src/App.tsx src/components/Sidebar.tsx
git commit -m "refactor: lift theme state into shared useTheme hook"
```

---

### Task 2: Add Framer Motion and a `Reveal` scroll-animation component, wire into hero

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `src/components/Reveal.tsx`
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- Produces (from `src/components/Reveal.tsx`, used by later tasks):
  - `Reveal({ children, className?, as?, id? }: { children: ReactNode; className?: string; as?: 'div' | 'ul' | 'li' | 'section'; id?: string })` — single fade+slide-up block, default `as="div"`. `id` passes through to the rendered element (needed so scroll-anchor ids like `#projects` can live directly on the animated element instead of requiring an extra wrapper).
  - `RevealGroup({ children, className?, as?, id? })` — same prop shape as `Reveal`; wraps a list container, staggers direct `RevealItem` children by 50ms.
  - `RevealItem({ children, className?, as?, id? })` — same prop shape; must be used inside a `RevealGroup` to get the stagger (Framer Motion variant propagation).
  - All three render a plain (non-motion) element with no animation when `useReducedMotion()` is true.

- [ ] **Step 1: Install Framer Motion**

Run: `npm install framer-motion`
Expected: `framer-motion` appears in `package.json` dependencies and `package-lock.json` updates.

- [ ] **Step 2: Create the Reveal components**

Create `src/components/Reveal.tsx`:

```tsx
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

type Tag = 'div' | 'ul' | 'li' | 'section'

const MOTION_TAG = {
  div: motion.div,
  ul: motion.ul,
  li: motion.li,
  section: motion.section,
} as const

const PLAIN_TAG = {
  div: 'div',
  ul: 'ul',
  li: 'li',
  section: 'section',
} as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

type RevealProps = {
  children: ReactNode
  className?: string
  as?: Tag
  id?: string
}

/** Fades + slides a block in when it scrolls into view. Renders statically (no animation) under prefers-reduced-motion. */
export function Reveal({ children, className, as = 'div', id }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    const Plain = PLAIN_TAG[as]
    return <Plain id={id} className={className}>{children}</Plain>
  }
  const MotionTag = MOTION_TAG[as]
  return (
    <MotionTag
      id={id}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
    >
      {children}
    </MotionTag>
  )
}

/** Wraps a list; direct RevealItem children stagger in by 50ms once the group scrolls into view. */
export function RevealGroup({ children, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    const Plain = PLAIN_TAG[as]
    return <Plain className={className}>{children}</Plain>
  }
  const MotionTag = MOTION_TAG[as]
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
    >
      {children}
    </MotionTag>
  )
}

/** A single staggered item inside a RevealGroup. */
export function RevealItem({ children, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    const Plain = PLAIN_TAG[as]
    return <Plain className={className}>{children}</Plain>
  }
  const MotionTag = MOTION_TAG[as]
  return (
    <MotionTag className={className} variants={fadeUp}>
      {children}
    </MotionTag>
  )
}
```

- [ ] **Step 3: Wire `Reveal` into the hero and add the `id="home"` anchor**

Modify `src/pages/Home.tsx`. Change the import line and the two spots noted below.

Add to the top imports:

```tsx
import { Reveal } from '../components/Reveal'
```

Change this (current lines 13–14):

```tsx
    <div className="everything-wrapper">
    <section className="home home-reference">
```

to:

```tsx
    <div className="everything-wrapper">
    <section className="home home-reference" id="home">
```

Change this (current lines 21–54, the `.hero-content` block) — wrap the `.profile-intro` div's contents with `Reveal`:

```tsx
          <div className="hero-content">
            <Reveal className="profile-intro">
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
            </Reveal>
            <Card3D cardImageName={selectedCardName} />
          </div>
```

Note: `Reveal`'s default `as="div"` matches the original `<div className="profile-intro">`, so no CSS changes are needed — the class still carries all layout/visual rules.

- [ ] **Step 4: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`.
- Reload the page and watch the hero intro text fade + slide up on load.
- Open devtools → Rendering tab → set "Emulate CSS media feature prefers-reduced-motion" to "reduce" → reload → confirm the hero text appears instantly with no animation.
- Confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/Reveal.tsx src/pages/Home.tsx
git commit -m "feat: add framer-motion and Reveal scroll-animation component"
```

---

### Task 3: Bottom tab bar for mobile navigation

**Files:**
- Create: `src/hooks/useActiveSection.ts`
- Create: `src/components/BottomNav.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `Theme` type and `theme`/`toggleTheme` values from `src/hooks/useTheme.ts` (Task 1).
- Produces: `useActiveSection(ids: string[]): string` (returns the id of the section currently in view, defaulting to `ids[0]`). `BottomNav({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void })` default export.

- [ ] **Step 1: Create the active-section hook**

Create `src/hooks/useActiveSection.ts`:

```ts
import { useEffect, useState } from 'react'

/**
 * Tracks which of the given element ids currently sits in a thin band near
 * the top of the viewport, so nav UI can highlight the section the user is
 * actually reading. Falls back to the first id until something intersects.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0])
  const key = ids.join(',')

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return active
}
```

- [ ] **Step 2: Create the BottomNav component**

Create `src/components/BottomNav.tsx`:

```tsx
import { motion } from 'framer-motion'
import { useActiveSection } from '../hooks/useActiveSection'
import type { Theme } from '../hooks/useTheme'

type BottomNavProps = {
  theme: Theme
  onToggleTheme: () => void
}

const SECTIONS: { id: string; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'resume', label: 'Resume' },
]

export default function BottomNav({ theme, onToggleTheme }: BottomNavProps) {
  const active = useActiveSection(SECTIONS.map((s) => s.id))

  const scrollToId = (id: string) => {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {SECTIONS.map(({ id, label }) => (
        <motion.button
          key={id}
          type="button"
          className={`bottom-nav-item${active === id ? ' active' : ''}`}
          onClick={() => scrollToId(id)}
          whileTap={{ scale: 0.94 }}
          aria-current={active === id ? 'true' : undefined}
        >
          <span className="bottom-nav-label">{label}</span>
        </motion.button>
      ))}
      <motion.button
        type="button"
        className="bottom-nav-item bottom-nav-theme"
        onClick={onToggleTheme}
        whileTap={{ scale: 0.94 }}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span className="bottom-nav-icon" aria-hidden="true">{theme === 'dark' ? '✦' : '✧'}</span>
      </motion.button>
    </nav>
  )
}
```

- [ ] **Step 3: Add `id="projects"` / `id="resume"` confirmation (no change needed)**

`src/pages/Home.tsx` already has `id="projects"` and `id="resume"` on the two `section-wrapper` divs (lines 59 and 63 of the current file), and Task 2 added `id="home"` to the hero `<section>`. No further ID changes are needed — just confirm by reading the file that all three ids (`home`, `projects`, `resume`) are present before moving on.

- [ ] **Step 4: Render BottomNav from App.tsx**

Modify `src/App.tsx` — add the import and render `BottomNav` as a sibling of `.app-layout`:

```tsx
import './App.css'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Resume from './pages/Resume'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="site-root">
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

      <BottomNav theme={theme} onToggleTheme={toggleTheme} />
    </div>
  )
}
```

- [ ] **Step 5: Replace the icon-rail breakpoint with a sidebar-hide + bottom-nav-show breakpoint in `App.css`**

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

Replace it with (this drops the icon-rail rules — `.app-layout` grid change, `.sidebar` width, and hiding `.brand`/`.nav-label`/`.sidebar-footer` — since the sidebar now stays full-width down to 768px instead of shrinking to an icon rail; the typography scaling rules are kept unchanged):

```css
@media (max-width: 980px) {
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

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .app-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .bottom-nav {
    display: flex;
  }

  .site-main {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }
}
```

- [ ] **Step 6: Add the BottomNav styles to `App.css`**

Add this new block anywhere after the `.sidebar-footer` rule (e.g. right after the sidebar-related rules, before `.content-area`):

```css
.bottom-nav {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
  align-items: center;
  justify-content: space-around;
  gap: 4px;
}

.bottom-nav-item {
  flex: 1;
  min-height: 48px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--text-subtle);
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: color 140ms ease;
}

.bottom-nav-item.active {
  color: var(--text);
}

.bottom-nav-theme {
  flex: 0 0 auto;
  width: 44px;
}

.bottom-nav-icon {
  font-size: 18px;
  line-height: 1;
}
```

- [ ] **Step 7: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open devtools, toggle device toolbar to 375px width.
- Confirm the sidebar disappears and a bottom bar with Home / Projects / Resume / theme toggle appears, fixed to the bottom.
- Tap/click each item; confirm it scrolls to the right section.
- Scroll manually through the page and confirm the active tab highlight (text color) updates as each section comes into view.
- Confirm content isn't hidden behind the bar (scroll to the very bottom of the Resume section and check the last item is fully visible above the bar).
- Widen the viewport back past 768px; confirm the sidebar reappears and the bottom bar disappears, and desktop layout looks unchanged from before this task.
- Confirm no horizontal scrollbar appears at 375px.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useActiveSection.ts src/components/BottomNav.tsx src/App.tsx src/App.css
git commit -m "feat: add mobile bottom nav bar, replacing icon-rail sidebar collapse"
```

---

### Task 4: Visual decluttering CSS pass

**Files:**
- Modify: `src/App.css`

**Interfaces:** None (CSS-only, no component signatures change).

> Note on scope correction: the design spec called for (a) removing `box-shadow` from `.rover-step-card`, `.gh-card`, `.stat-card`, `.paper-preview`, `.urdf-viewer`, and (b) unifying `.gh-topic`/`.rover-step-tag`/`.rover-step-kicker` pill styles. Re-checking `App.css` directly: `.gh-card`, `.stat-card`, and `.paper-preview` never had `box-shadow` in the first place, and `.rover-step-card` / `.rover-step-kicker` only exist in `src/pages/RoverShowcase.tsx`, which isn't routed/imported anywhere (dead code) — so there's no live duplication between `.gh-topic` (a filled pill) and `.rover-step-tag` (an outlined uppercase kicker, the only one of the pair actually rendered, via `Projects.tsx`) to unify; they're intentionally different styles for different live purposes. This task applies only the changes that are real and live: removing shadow from `.urdf-viewer` (the one live in-flow card that had it), tightening the sidebar nav spacing, and bumping contrast on three verified-live selectors.

- [ ] **Step 1: Remove box-shadow from `.urdf-viewer`**

In `src/App.css`, find:

```css
.urdf-viewer {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
}
```

Replace with:

```css
.urdf-viewer {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--line);
}
```

- [ ] **Step 2: Tighten sidebar nav spacing/sizing**

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
  gap: 20px;
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
  font-size: 22px;
  line-height: 1.24;
  padding-block: 8px;
  font-weight: 700;
  letter-spacing: -0.03em;
  transition: color 140ms ease;
  display: block;
  background: transparent;
  width: fit-content;
  border: none;
  cursor: pointer;
}
```

(The `transform 140ms ease` transition is dropped here because Task 6 replaces the CSS hover-transform with a Framer Motion `whileHover`, to avoid two systems animating the same property.)

Then find:

```css
.sidebar-nav button:hover {
  color: var(--text);
  transform: translateX(1px);
  background: transparent;
}
```

Replace with:

```css
.sidebar-nav button:hover {
  color: var(--text);
  background: transparent;
}
```

- [ ] **Step 3: Bump contrast on three verified-live low-contrast selectors**

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

- [ ] **Step 4: Verify types and build**

Run: `npm run build`
Expected: No errors (CSS-only change, but confirms nothing else broke).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`.
- Check the sidebar: nav items should feel proportionate (not oversized), with tighter vertical spacing.
- Open a project row and a resume row; confirm the year/date, skills line, and (for resume) location text are a bit more readable than before, in both light and dark theme.
- Open the rover project's dropdown (Projects page) and confirm the 3D URDF viewer no longer has a heavy drop shadow around it (just a border).

- [ ] **Step 6: Commit**

```bash
git add src/App.css
git commit -m "style: declutter shadow/spacing/contrast inconsistencies in shell chrome"
```

---

### Task 5: Responsive fixes for hero, 3D card, and URDF viewer

**Files:**
- Modify: `src/App.css`

**Interfaces:** None (CSS-only).

- [ ] **Step 1: Make the hero content wrap on narrow screens**

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

(Dropping the fixed `height: 392px` lets the row size to its content instead of clipping/forcing a fixed height on narrow screens.)

- [ ] **Step 2: Make the 3D card fluid instead of fixed 280×392**

In `src/App.css`, find:

```css
.card-3d-container {
  perspective: 1000px;
  width: 280px;
  height: 392px;
  margin: 0;
  cursor: grab;
  transition: transform 100ms ease-out;
  transform-style: preserve-3d;
}
```

Replace with:

```css
.card-3d-container {
  perspective: 1000px;
  width: var(--card-width);
  height: var(--card-height);
  margin: 0;
  cursor: grab;
  transition: transform 100ms ease-out;
  transform-style: preserve-3d;
}
```

Then find:

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

(`392 / 280 = 1.4`, so the aspect ratio is preserved. `.card-3d-content`, `.card-side`, `.card-left`, `.card-right` already reference `var(--card-width)`/`var(--card-height)`/`var(--card-depth)` — confirmed by reading the current file — so they need no changes and will now scale automatically. `margin: 0 auto` centers the card when `.hero-content` wraps.)

- [ ] **Step 3: Add a hero-content wrap rule and shrink the 3D card further on narrow screens, reusing the existing 720px breakpoint**

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
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 4: Shrink the URDF viewer canvas on narrow screens**

In `src/App.css`, find the existing block (around line 1131):

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

(`URDFViewer.tsx` already has a `ResizeObserver` that keeps the Three.js camera/renderer in sync with its container size — confirmed by reading the component — so this pure CSS height change is sufficient; no component code changes needed.)

- [ ] **Step 5: Verify types and build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open devtools device toolbar at 375px width.
- Confirm the hero's 3D card sits below the intro text, centered, and doesn't overflow horizontally (no horizontal scrollbar).
- Drag/rotate the 3D card at this width; confirm it still responds to drag.
- Open the rover project dropdown at this width; confirm the URDF 3D viewer is smaller and fits within the column without overflow, and still orbits/zooms correctly.
- Widen back to desktop width (~1280px) and confirm the hero and 3D card look identical to before this task (280×392, unchanged position).

- [ ] **Step 7: Commit**

```bash
git add src/App.css
git commit -m "fix: make hero layout, 3D card, and URDF viewer responsive on small screens"
```

---

### Task 6: Apply Reveal/hover-tap motion to remaining lists and interactive elements

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Projects.tsx`
- Modify: `src/pages/Resume.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `Reveal`, `RevealGroup`, `RevealItem` from `src/components/Reveal.tsx` (Task 2).

- [ ] **Step 1: Wrap the Projects and Resume section wrappers in `Reveal`, and give evolution chips a tap/hover effect, in `Home.tsx`**

Modify `src/pages/Home.tsx` (the import-block update is at the end of this step, below). Change the evolution-chip button (inside the `Reveal`-wrapped block from Task 2) from:

```tsx
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
```

to:

```tsx
                  <motion.button
                    key={name}
                    type="button"
                    className={`evolution-chip${selectedCardName === name ? ' active' : ''}`}
                    onClick={() => setSelectedCardName(name)}
                    aria-label={`Show ${name} card`}
                    aria-pressed={selectedCardName === name}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <img src={`${import.meta.env.BASE_URL}gifs/${name}.gif`} alt={name} />
                  </motion.button>
```

Change the Projects/Resume section wrappers from:

```tsx
    <div id="projects" ref={projectsRef} className="section-wrapper">
      <Projects />
    </div>

    <div id="resume" ref={resumeRef} className="section-wrapper">
      <Resume />
    </div>
```

to:

```tsx
    <Reveal as="div" id="projects" className="section-wrapper">
      <Projects />
    </Reveal>

    <Reveal as="div" id="resume" className="section-wrapper">
      <Resume />
    </Reveal>
```

(`id` now lives directly on the same element that carries the `section-wrapper` class, so `scrollIntoView` and the class's `scroll-margin-top` CSS both still target/apply to exactly the element they did before — no behavior change there. `projectsRef` and `resumeRef` are dropped below, in this same step, since they were never read anywhere else in this file — verify that by searching the current `Home.tsx` for `projectsRef`/`resumeRef` before deleting; if something else turns out to use them, keep them attached to the `Reveal` element instead via a `ref` prop rather than deleting.)

Also update the top of `Home.tsx` — remove the now-unused refs and the now-unused `useRef` import. Change:

```tsx
import { useState, useRef } from 'react'
import Card3D from '../components/Card3D'
import Projects from './Projects'
import Resume from './Resume'

export default function Home({ onNavigate: _onNavigate }: { onNavigate: (p: 'projects' | 'resume' | 'home') => void }) {
  const [selectedCardName, setSelectedCardName] = useState('lucario')
  const projectsRef = useRef<HTMLDivElement>(null)
  const resumeRef = useRef<HTMLDivElement>(null)
  const pokemonNames = ['lucario', 'espeon', 'flareon', 'glaceon', 'jolteon', 'leafeon', 'sylveon', 'umbreon', 'vaporeon']
```

to:

```tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import Card3D from '../components/Card3D'
import { Reveal } from '../components/Reveal'
import Projects from './Projects'
import Resume from './Resume'

export default function Home({ onNavigate: _onNavigate }: { onNavigate: (p: 'projects' | 'resume' | 'home') => void }) {
  const [selectedCardName, setSelectedCardName] = useState('lucario')
  const pokemonNames = ['lucario', 'espeon', 'flareon', 'glaceon', 'jolteon', 'leafeon', 'sylveon', 'umbreon', 'vaporeon']
```

(This replaces the plain `import { Reveal } from '../components/Reveal'` import added in Task 2 Step 3 — Task 2 only needed `Reveal`; this step adds the `motion` import alongside it in the same import block, consolidating both edits into one final import list so there's no duplicate/conflicting import line.)

- [ ] **Step 2: Add Reveal/motion to the Projects list**

Modify `src/pages/Projects.tsx`. Add imports:

```tsx
import { motion } from 'framer-motion'
import { RevealGroup, RevealItem } from '../components/Reveal'
```

Change:

```tsx
      <ul className="list">
        {items.map((p, i) => (
          <li key={i} className="list-item">
            <button
              className={`item-button ${openIndex === i ? 'open' : ''}`}
              aria-expanded={openIndex === i}
              onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
            >
```

to:

```tsx
      <RevealGroup as="ul" className="list">
        {items.map((p, i) => (
          <RevealItem as="li" key={i} className="list-item">
            <motion.button
              className={`item-button ${openIndex === i ? 'open' : ''}`}
              aria-expanded={openIndex === i}
              onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
            >
```

And close out the corresponding closing tags — change:

```tsx
          </li>
        ))}
      </ul>
    </section>
```

to:

```tsx
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
```

And change the button's own closing tag from `</button>` to `</motion.button>` (it's the direct closer of the `item-button`, right before the `{openIndex === i && (` conditional block).

- [ ] **Step 3: Add Reveal/motion to the Resume experience list**

Modify `src/pages/Resume.tsx`. Add imports:

```tsx
import { motion } from 'framer-motion'
import { RevealGroup, RevealItem } from '../components/Reveal'
```

Change:

```tsx
          <ul className="list">
            {resume.experience.map((e, idx) => (
              <li key={idx} className="list-item">
                <button
                  className={`item-button ${openIndex === idx ? 'open' : ''}`}
                  aria-expanded={openIndex === idx}
                  onClick={() => {
                    setOpenIndex((prev) => (prev === idx ? null : idx))
                  }}
                >
```

to:

```tsx
          <RevealGroup as="ul" className="list">
            {resume.experience.map((e, idx) => (
              <RevealItem as="li" key={idx} className="list-item">
                <motion.button
                  className={`item-button ${openIndex === idx ? 'open' : ''}`}
                  aria-expanded={openIndex === idx}
                  onClick={() => {
                    setOpenIndex((prev) => (prev === idx ? null : idx))
                  }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                >
```

And change the corresponding closing tags — from:

```tsx
              </li>
            ))}
          </ul>
```

to:

```tsx
              </RevealItem>
            ))}
          </RevealGroup>
```

And change the button's own closing tag from `</button>` to `</motion.button>` (directly before the `{openIndex === idx && (` conditional block).

- [ ] **Step 4: Add hover/tap motion to the sidebar nav buttons**

Modify `src/components/Sidebar.tsx`. Add the import:

```tsx
import { motion } from 'framer-motion'
```

Change each of the three nav buttons, e.g.:

```tsx
          <button
            className="nav-button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to home"
          >
            <span className="nav-label">Home</span>
          </button>
```

to:

```tsx
          <motion.button
            className="nav-button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to home"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Home</span>
          </motion.button>
```

Apply the same `motion.button` + `whileHover={{ x: 2 }}` change to the "Projects" and "Resume" nav buttons in the same file (same pattern, different `onClick`/`aria-label`/label text — unchanged otherwise).

- [ ] **Step 5: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`.
- Scroll down to the Projects section; confirm the project rows fade/slide in with a slight stagger the first time they scroll into view (not on every scroll past them — only once).
- Do the same for the Resume section's experience rows.
- Hover over a project/resume row; confirm a subtle scale effect. Click to expand; confirm it still opens/closes correctly.
- Hover and click a Pokémon evolution chip; confirm the scale-up/scale-down feel and that clicking still swaps the 3D card image.
- Hover over the sidebar nav buttons (desktop width); confirm the slight rightward shift feels smooth (replacing the old CSS transform).
- Click each sidebar nav button; confirm scrolling still works exactly as before.
- Confirm clicking each item in the bottom nav (mobile width, from Task 3) still correctly scrolls to `#home`/`#projects`/`#resume` now that `#projects`/`#resume` live directly on the `Reveal`-wrapped element.
- Emulate `prefers-reduced-motion: reduce` again and confirm everything above still functions with instant/no animation and no layout breakage.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Home.tsx src/pages/Projects.tsx src/pages/Resume.tsx src/components/Sidebar.tsx
git commit -m "feat: add scroll-reveal and hover/tap motion to lists and nav"
```

---

### Task 7: Final cross-browser QA pass

**Files:** None expected (fix-up only, if QA finds issues).

- [ ] **Step 1: Full build and lint**

Run: `npm run build`
Expected: No errors.

Run: `npm run lint`
Expected: No errors (fix any that appear from the motion/JSX changes before proceeding).

- [ ] **Step 2: Manual QA matrix**

Run: `npm run dev`. For each of 375px, 768px, and ~1280px viewport widths, in both light and dark theme (toggle via the theme button), and with `prefers-reduced-motion: reduce` both off and on:

- No horizontal scroll at any width.
- Bottom nav present only at ≤768px; sidebar present only above that.
- Scroll-to-section works from both the sidebar (desktop) and bottom nav (mobile).
- Hero, project stats, project list, resume stats, resume list, rover dropdown (with 3D viewer), and modal (click a resume/project row that opens one, if applicable) all render without visual overflow or clipping.
- No console errors or warnings at any width/theme/motion combination.

- [ ] **Step 3: Fix any issues found**

If QA in Step 2 surfaces an issue, fix it directly in the relevant file from earlier tasks, re-run Step 1, and re-check the specific case that failed.

- [ ] **Step 4: Final commit (only if Step 3 produced changes)**

```bash
git add -A
git commit -m "fix: address issues found in final responsive/motion QA pass"
```

If Step 3 produced no changes, skip this commit — there's nothing to commit.
