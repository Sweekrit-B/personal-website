# Sweekrit Bhatnagar — Personal Website

A one-page portfolio: a board of projects, experience, publications and links beside a Pokémon card. Built with Vite and TypeScript, no framework. Deployed to GitHub Pages.

## The page

- **Board** — Projects, Industry Experiences, Research, Contract Projects, Publications, Presentations and Links, as columns of rows. Each row's title is colored by its fields (a gradient when it has several).
- **Cards** — clicking a row opens a focused card: one-line bullets, a pipeline or architecture diagram, and for some projects a live demo, video or tabs (the Mars Rover's 3D model and mission tabs, ML From Scratch, General Atomics' model tabs).
- **Pokémon card** — a holo card with a sprite picker, and two small donuts under it: fields and languages across everything on the board.

## Where things live

- `index.html` — the page: styles, layout and the board/card rendering script.
- `src/` — modules the page loads:
  - `diagrams.ts` — the SVG pipeline and architecture diagrams, mounted into `[data-diagram]`.
  - `roverViewer.ts`, `roverTabs.ts` — the Mars Rover 3D URDF viewer and the shared tab renderer.
  - `mlTabs.ts`, `gaTabs.ts` — the ML From Scratch and General Atomics tabs.
  - `card-body.css` — styles for the open card's body.
  - `assets/` — the rover URDF and its STL meshes.
- `public/lib/project.json`, `public/lib/resume.json` — the content. Edit these to change projects and experience; card bullets for experience live in `EXP_POINTS` / `EXP_PROJECTS` in `index.html`.
- `public/` — images, logos, publication PDFs, card art and sprites, copied as is.
- `figures/` — build scripts for the static figures in `public/figures/` (the Fruit Fly RNN and rover CNN figures). They import the anatomy skill's kit from `~/.claude/skills/anatomy`; run `node figures/<name>/build.mjs` (add `--light` for the light variant) to regenerate.

## Development

```bash
npm install
npm run dev       # local dev server at http://localhost:5173/personal-website/
npm run lint      # eslint
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build locally
```

## Deployment

```bash
npm run deploy
```

This builds, then publishes `dist/` to the `gh-pages` branch with the `gh-pages` package. The site is served at the `base` path in `vite.config.ts` (`/personal-website/`).
