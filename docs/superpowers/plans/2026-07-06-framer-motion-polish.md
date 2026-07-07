# Framer Motion Scroll-Reveal + Hover/Tap Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, consistent Framer Motion layer on top of the existing (already responsive) portfolio site: scroll-triggered fade+slide-up reveals (staggered for lists), and a shared spring hover/tap feel on nav buttons, list rows, and evolution chips — replacing several slightly different CSS hover transitions with one system, respecting `prefers-reduced-motion`.

**Architecture:** A single new component file, `src/components/Reveal.tsx`, exports three thin wrappers (`Reveal`, `RevealGroup`, `RevealItem`) around Framer Motion's `motion.*` elements. Every consumer either wraps existing JSX in these components (no restructuring) or swaps a plain `<button>`/`<li>`/`<ul>` for its `motion.*`/`Reveal*` equivalent with `whileHover`/`whileTap` props. CSS changes are subtractive only — removing the specific transition properties Framer Motion now owns, nothing else.

**Tech Stack:** React 19 + TypeScript + Vite, plain CSS (custom properties, no CSS-in-JS), adding `framer-motion`.

## Global Constraints

- This repo has no test runner (no vitest/jest — `package.json` only has `dev`, `build`, `lint`, `preview`, `deploy`). Every task's verification is `npm run build` (runs `tsc -b` then `vite build`, catches type errors) and `npm run lint` — not automated unit tests.
- **Do not use the gstack `/browse` skill or any headless-browser automation for verification in this project** — it has been reported to significantly slow the user's machine. Verification is build/lint plus reading the implementation against Framer Motion's documented `whileInView`/`useReducedMotion`/`whileHover`/`whileTap` behavior. If a live look is wanted, the user runs `npm run dev` themselves — don't offer to drive a browser for them.
- Do not modify `src/pages/RoverShowcase.tsx` (dead code, not routed anywhere), `src/components/Card3D.tsx` (bespoke drag/rotation physics, out of scope), `src/components/URDFViewer.tsx`, `src/components/MobileHeader.tsx`, `src/hooks/useTheme.ts`, or `src/App.tsx`.
- The mobile nav drawer's (`src/components/NavDrawer.tsx`) open/close slide animation stays CSS — only its individual nav buttons get `whileTap`, not the drawer's own open/close transition.
- Every element converted to `motion.button` must remain a real `<button>` — no `<div onClick>` patterns.
- Run all commands from `C:\Users\sweek\Downloads\projects\personal-website-all\personal-website`.

---

### Task 1: Install Framer Motion and create the Reveal components

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `src/components/Reveal.tsx`

**Interfaces:**
- Produces (consumed by Tasks 2-4): `Reveal({ children, className?, as?, id? })`, `RevealGroup({ children, className?, as? })`, `RevealItem({ children, className?, as? })` — all accept `as?: 'div' | 'ul' | 'li' | 'section'` (default `'div'`), all named exports from `src/components/Reveal.tsx`.

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

- [ ] **Step 3: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 4: Verify reduced-motion behavior by reading the code**

No live browser check (per Global Constraints). Confirm by reading `src/components/Reveal.tsx`: all three exports call `useReducedMotion()` and, when `true`, return a plain host element (no `motion.*`, no animation props) — matching the existing `@media (prefers-reduced-motion: reduce)` pattern already used for `.stat-arc--*` in `src/App.css`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/Reveal.tsx
git commit -m "feat: add framer-motion and Reveal scroll-animation components"
```

---

### Task 2: Wire Reveal and hover/tap motion into the Home page

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `Reveal` from `src/components/Reveal.tsx` (Task 1).

- [ ] **Step 1: Replace the full contents of `src/pages/Home.tsx`**

The current file has unused `projectsRef`/`resumeRef` refs (confirmed by grep — they're declared and attached via `ref={...}` but never read via `.current` anywhere in the codebase) that must be dropped since `Reveal`'s `as="div"` element takes an `id` prop, not a `ref`. The `id="projects"`/`id="resume"` anchors move onto the `Reveal`-wrapped element itself so `scrollIntoView` targeting and the `.section-wrapper` class's `scroll-margin-top` CSS both still apply to the same element as before.

Replace the full contents of `src/pages/Home.tsx` with:

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

  return (
    <div className="everything-wrapper">
    <section className="home home-reference">
      <div className="home-container">
        <div className="hero-profile">
          <div className="profile-name-row">
            <h1 className="profile-name">Sweekrit Bhatnagar</h1>
          </div>

          <div className="hero-content">
            <Card3D cardImageName={selectedCardName} />
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
                  <motion.button
                    key={name}
                    type="button"
                    className={`evolution-chip${selectedCardName === name ? ' active' : ''}`}
                    onClick={() => setSelectedCardName(name)}
                    aria-label={`Show ${name} card`}
                    aria-pressed={selectedCardName === name}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <img src={`${import.meta.env.BASE_URL}gifs/${name}.gif`} alt={name} />
                  </motion.button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>

    <Reveal as="div" id="projects" className="section-wrapper">
      <Projects />
    </Reveal>

    <Reveal as="div" id="resume" className="section-wrapper">
      <Resume />
    </Reveal>
    </div>
  )
}
```

- [ ] **Step 2: Remove the now-superseded `scale` transition/value from `.evolution-chip` in `src/App.css`**

In `src/App.css`, find:

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

Replace with (removes the `scale 140ms ease` transition and the static `scale: 1;` — Framer Motion's `whileHover`/`whileTap` on the button now owns scale via its own `transform`; `transform 140ms ease` is also removed since nothing in this rule sets `transform` anymore, only `border-color`/`background-color` remain CSS-driven):

```css
.evolution-chip {
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 4px;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease;
  position: relative;
}
```

Leave `.evolution-chip.active` (which also has a `scale: 1;` line) and `.evolution-chip.active::after` untouched — those control the persistent selected-state underline indicator, not the hover/tap transient effect, and are out of this task's scope.

- [ ] **Step 3: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 4: Verify by reading the code**

No live browser check (per Global Constraints). Confirm by reading the updated `src/pages/Home.tsx`:
- `Reveal` wraps `.profile-intro` and both section wrappers, each rendering a plain `div` under reduced motion.
- `id="projects"`/`id="resume"` are present on the `Reveal` elements (so `Sidebar.tsx`/`NavDrawer.tsx`'s existing `document.getElementById('projects')?.scrollIntoView(...)` calls still find their targets — those files are unmodified by this task).
- `motion.button` evolution chips have both `whileHover` and `whileTap`.
- No references to `projectsRef`/`resumeRef` remain.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx src/App.css
git commit -m "feat: add scroll-reveal and evolution-chip hover/tap motion to Home"
```

---

### Task 3: Reveal and hover/tap motion for the Projects list

**Files:**
- Modify: `src/pages/Projects.tsx`

**Interfaces:**
- Consumes: `RevealGroup`, `RevealItem` from `src/components/Reveal.tsx` (Task 1).

- [ ] **Step 1: Add imports**

In `src/pages/Projects.tsx`, find the import block:

```tsx
import { useEffect, useState, lazy, Suspense } from 'react'
import GitHubCard from '../components/GitHubCard'
import ProjectStats from '../components/ProjectStats'
```

Replace with:

```tsx
import { useEffect, useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { RevealGroup, RevealItem } from '../components/Reveal'
import GitHubCard from '../components/GitHubCard'
import ProjectStats from '../components/ProjectStats'
```

- [ ] **Step 2: Convert the list container and item button**

Find:

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

Replace with:

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
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
```

- [ ] **Step 3: Close the button, list item, and list with their new tags**

Find (the button's own closing tag, directly before the dropdown-content conditional):

```tsx
              <div className="item-right">{p.year}</div>
            </button>
```

Replace with:

```tsx
              <div className="item-right">{p.year}</div>
            </motion.button>
```

Find (the end of the list, right before the closing `</section>`):

```tsx
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Replace with:

```tsx
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}
```

- [ ] **Step 4: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Verify by reading the code**

No live browser check (per Global Constraints). Confirm by reading the updated file: `RevealGroup as="ul"` wraps the `.list`, each row is a `RevealItem as="li"`, the row button is `motion.button` with matching open/close `<motion.button>`/`</motion.button>` tags, and the existing `openIndex === i` dropdown-toggle logic is untouched (only the wrapping tags changed, not the conditional rendering inside).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Projects.tsx
git commit -m "feat: add scroll-reveal and hover/tap motion to Projects list"
```

---

### Task 4: Reveal and hover/tap motion for the Resume experience list

**Files:**
- Modify: `src/pages/Resume.tsx`

**Interfaces:**
- Consumes: `RevealGroup`, `RevealItem` from `src/components/Reveal.tsx` (Task 1).

- [ ] **Step 1: Add imports**

In `src/pages/Resume.tsx`, find:

```tsx
import { useEffect, useState } from 'react'
import ResumeStats from '../components/ResumeStats'
```

Replace with:

```tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RevealGroup, RevealItem } from '../components/Reveal'
import ResumeStats from '../components/ResumeStats'
```

- [ ] **Step 2: Convert the list container and item button**

Find:

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

Replace with:

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
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
```

- [ ] **Step 3: Close the button, list item, and list with their new tags**

Find (the button's own closing tag):

```tsx
                  <div className="item-right">{e.end ? `${e.start} - ${e.end}` : e.start}</div>
                </button>
```

Replace with:

```tsx
                  <div className="item-right">{e.end ? `${e.start} - ${e.end}` : e.start}</div>
                </motion.button>
```

Find (the end of the list):

```tsx
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
```

Replace with:

```tsx
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </section>
  )
```

- [ ] **Step 4: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Verify by reading the code**

No live browser check (per Global Constraints). Confirm by reading the updated file, same checks as Task 3 Step 5 (matching open/close tags, untouched toggle logic).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Resume.tsx
git commit -m "feat: add scroll-reveal and hover/tap motion to Resume experience list"
```

---

### Task 5: Hover/tap motion for the desktop sidebar and mobile drawer nav buttons

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/NavDrawer.tsx`
- Modify: `src/App.css`

**Interfaces:** None new (both components keep their existing prop signatures).

- [ ] **Step 1: Add hover motion to the desktop sidebar nav buttons**

In `src/components/Sidebar.tsx`, find:

```tsx
import { useEffect, useState } from 'react'
import type { Theme } from '../hooks/useTheme'
```

Replace with:

```tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Theme } from '../hooks/useTheme'
```

Then find the three nav buttons:

```tsx
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
```

Replace with:

```tsx
        <nav className="sidebar-nav">
          <motion.button
            className="nav-button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to home"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Home</span>
          </motion.button>
          <motion.button
            className="nav-button"
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="Scroll to projects"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Projects</span>
          </motion.button>
          <motion.button
            className="nav-button"
            onClick={() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="Scroll to resume"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Resume</span>
          </motion.button>
        </nav>
```

- [ ] **Step 2: Remove the now-superseded CSS hover transform on `.sidebar-nav button`**

In `src/App.css`, find:

```css
.sidebar-nav button:hover {
  color: var(--text);
  transform: translateX(1px);
  background: transparent;
}
```

Replace with (the `transform` is now owned by Framer Motion's `whileHover={{ x: 2 }}` on the button; `color`/`background` stay CSS-driven):

```css
.sidebar-nav button:hover {
  color: var(--text);
  background: transparent;
}
```

Then find `.sidebar-nav button` (the base rule) and remove the now-unused `transform` from its `transition` list:

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
  transition: color 140ms ease;
  display: block;
  background: transparent;
  width: fit-content;
  border: none;
  cursor: pointer;
}
```

- [ ] **Step 3: Add tap motion to the mobile drawer nav buttons**

In `src/components/NavDrawer.tsx`, find:

```tsx
type NavDrawerProps = {
  open: boolean
  onClose: () => void
}
```

Replace with:

```tsx
import { motion } from 'framer-motion'

type NavDrawerProps = {
  open: boolean
  onClose: () => void
}
```

Then find the three nav buttons:

```tsx
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
```

Replace with:

```tsx
        <nav className="nav-drawer-nav">
          <motion.button
            onClick={() => go(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            aria-label="Scroll to home"
            whileTap={{ scale: 0.96 }}
          >
            Home
          </motion.button>
          <motion.button
            onClick={() => go(() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to projects"
            whileTap={{ scale: 0.96 }}
          >
            Projects
          </motion.button>
          <motion.button
            onClick={() => go(() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to resume"
            whileTap={{ scale: 0.96 }}
          >
            Resume
          </motion.button>
        </nav>
```

- [ ] **Step 4: Verify types and build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Verify by reading the code**

No live browser check (per Global Constraints). Confirm by reading both updated components: every nav button is a `motion.button` with the specified `whileHover`/`whileTap`, `onClick` handlers are unchanged (same scroll targets), and `src/App.css`'s `.sidebar-nav button`/`.sidebar-nav button:hover` no longer reference `transform`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.tsx src/components/NavDrawer.tsx src/App.css
git commit -m "feat: add hover/tap motion to sidebar and drawer nav buttons"
```

---

### Task 6: Final build/lint QA pass

**Files:** None expected (fix-up only, if QA finds issues).

- [ ] **Step 1: Full build and lint**

Run: `npm run build`
Expected: No errors.

Run: `npm run lint`
Expected: No errors (fix any that appear before proceeding).

- [ ] **Step 2: Code-level consistency check**

No live browser or `/browse` (per Global Constraints). Read through all files touched by Tasks 1-5 together and confirm:

- Every `Reveal`/`RevealGroup`/`RevealItem` usage passes a valid `as` value matching the element it replaces (`ul`/`li`/`div`).
- Every `motion.button` conversion kept its original `onClick`/`aria-*` props unchanged — only wrapping tag and `whileHover`/`whileTap`/`transition` props were added.
- No leftover plain `<button>`/`<ul>`/`<li>` where the task specified a `motion.*`/`Reveal*` replacement, and no double-wrapping (e.g. a `motion.button` accidentally left inside another `motion.button`).
- `src/App.css` no longer has orphaned `transform`/`scale` transition properties on `.evolution-chip` or `.sidebar-nav button`/`.sidebar-nav button:hover` (removed in Tasks 2 and 5), and nothing else in those rules was touched.
- `Card3D.tsx`, `URDFViewer.tsx`, `MobileHeader.tsx`, `useTheme.ts`, `App.tsx`, and `RoverShowcase.tsx` are untouched across all five prior tasks' diffs.

- [ ] **Step 3: Fix any issues found**

If Step 2 surfaces an issue, fix it directly in the relevant file, re-run Step 1, and re-check.

- [ ] **Step 4: Final commit (only if Step 3 produced changes)**

```bash
git add -A
git commit -m "fix: address issues found in final motion QA pass"
```

If Step 3 produced no changes, skip this commit — there's nothing to commit.
