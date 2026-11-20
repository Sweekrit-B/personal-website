# DESIGN.md — Field Manual

Single source of design truth for this site. Read before changing any UI. Status: **draft v1** (2026-11-19). Items marked _(proposed)_ are not yet approved.

## Concept

The site reads like an **annotated engineering field manual**: hairline grids, numbered figures, mono callout labels with leader lines, isometric technical drawings. **Pokémon trading cards are the index**: small holo cards open each manual chapter. Calm and editorial on a dark page, with one saturated type color at a time.

- Audience: industry recruiters/engineers and research labs, equally.
- Feel: calm, editorial, crafted. Precise, never noisy.
- Theme: dark-first. Light mode supported ("printed manual" variant).
- Reference taken: Stripe Press — rich color fields and objects presented as artifacts on a dark page. Not taken: its glitchy WebGL.
- Rejected: generic dev-portfolio look (brittanychiang.com, joshwcomeau.com).

## Principles

1. **Depth lives in the manual, not the card.** A card holds at most 4 fields.
2. **One accent at a time.** The selected Pokémon's type color is the only saturated color in a view.
3. **Every figure is labeled.** Numbers and figures get a mono label (`FIG. 01`, `▸ -70% latency`).
4. **One strong effect per viewport.** Effects are moments, not ambience.
5. **Motion explains; it never decorates.** Follow the ux-motion skill.

## Layout

- **TOC rail** (desktop, reuses `Sidebar`): numbered chapters in mono — `00 Index`, `01 Projects`, `02 Experience`, `03 Skills`. Mobile keeps the top bar + drawer.
- **Hero**: name, one-line role, the holo Pokémon card, type selector chips.
- **Projects**:
  1. *Index*: row of 4–6 featured holo cards.
  2. *Manual spread* per featured project: `FIG. NN — TITLE ........ YEAR` header on a hairline, Anatomy figure with callouts, body ≤ 65ch, results as mono metric rows.
  3. *Appendix A*: the remaining projects as a dense table (No., title, year, type, stack).
- **Experience**: a service log — mono dates column, role + company, expandable bullets.
- **Skills**: existing constellation, restyled to hairline/mono.
- Background: faint hairline grid (24px), fading toward content.
- Text measure ≤ 65ch. Section spacing generous (`--space-9`+).

## Typography _(proposed)_

| Role | Font | Use |
|---|---|---|
| Sans | IBM Plex Sans | Headings and body |
| Mono | IBM Plex Mono | Figure numbers, labels, dates, metrics, TOC |

Fallback option: keep Inter for body, add JetBrains Mono for labels.

Scale (6 steps, replaces 25 ad-hoc sizes):

| Token | Size | Use |
|---|---|---|
| `--fs-label` | 12px mono, +0.08em, uppercase | FIG labels, callouts, dates |
| `--fs-small` | 14px | Captions, meta |
| `--fs-body` | 17px | Body |
| `--fs-h3` | 21px | Spread subheads |
| `--fs-h2` | 28px | Section / spread titles |
| `--fs-display` | clamp(36px, 6vw, 56px) | Name |

## Color

Dark base (blueprint-black, slightly blue):

| Token | Dark | Light (printed manual) |
|---|---|---|
| `--page-bg` | `#0b0e12` | `#f4f1ea` |
| `--surface` | `#11151b` | `#fbf9f4` |
| `--text` | `#e8e6e1` | `#1a1c1f` |
| `--text-muted` | `#9aa3ad` | `#5b636c` |
| `--text-subtle` | `#5d6670` | `#8a9099` |
| `--line` | `#1f2731` | `#d8d3c8` |
| `--grid` | `rgba(120,150,190,0.06)` | `rgba(40,50,70,0.06)` |
| `--accent` | = selected type color | same |

Type colors _(proposed, tuned for dark)_ — the selected Pokémon sets `--accent`:

| Pokémon | Type | Color |
|---|---|---|
| Lucario | Fighting/Steel (aura) | `#4f8fe0` |
| Espeon | Psychic | `#e86fa6` |
| Flareon | Fire | `#e8774a` |
| Glaceon | Ice | `#7fd4d8` |
| Jolteon | Electric | `#f2c94c` |
| Leafeon | Grass | `#6cc070` |
| Sylveon | Fairy | `#eda3c9` |
| Umbreon | Dark | `#a89cc8` |
| Vaporeon | Water | `#5b9cf0` |

Rows use their fields' type colors (`DOMAIN` in `index.html`):
AI/LLM → Psychic · Machine Learning → Ghost-violet · Data Science → Water · Full Stack → Electric · Systems/Robotics → Steel · Cloud → Ice.
A row with several fields draws its title as a left-to-right gradient through each field's color, in the order listed. The "Fields" donut under the card uses the same colors; the "Languages" donut uses the first four slots of the dataviz reference palette (dark steps), which pass its colorblind and contrast checks.

## Motion

Tokens (from the ux-motion skill):

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` — entering |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` — leaving |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` — moving |
| `--dur-fast` | 120ms — hover, press |
| `--dur-base` | 220ms — most transitions |
| `--dur-slow` | 360ms — panels, spreads |

Rules: no bare `ease`. Reveals run once. Stagger 40ms, cascade ≤ 300ms. Close faster than open. Spreads open from the clicked card (origin awareness). `prefers-reduced-motion` → fades only, no holo motion, no pixel bursts.

## Components

- **Index card** — TCG ratio 63:88. Fields: title, type pip, figure thumbnail, one stat. Holo foil follows the pointer on hover (own CSS, pointer → CSS vars; not the GPL pokemon-cards-css). Flagship = "rare" foil. Touch: static foil, tap opens.
- **Callout** — mono `--fs-label`, 1px leader line in `--line`, endpoint dot in `--accent`.
- **Figure header** — `FIG. NN — TITLE` left, year right, hairline below.
- **Metric row** — `▸ label ........ value` in mono; value in `--text`, label in `--text-muted`.
- **Appendix table** — mono No. column, hairline row dividers, no zebra.

## Effects budget

| Effect | Where | Rule |
|---|---|---|
| Holo foil | Hero card, index cards | Hover/pointer only |
| pixelfx burst | Hero card, on Pokémon switch | Once per click, type-matched |
| Anatomy figures | Featured manual spreads | Static SVG; draw-in once on view |
| Spark splat → URDF | Rover spread only | Only if the rover gets scanned; lazy-mounted |

At most one live WebGL canvas per viewport. No ambient background shaders.

## Open questions

- Fonts: Plex pair vs Inter + JetBrains Mono.
- Featured projects (4–6). Draft pick: Rover, Fruit Fly Connectome RNN, ML From Scratch in C++, Climate Storms (D3), Aletheia.
- Bio copy (waiting on user notes).
