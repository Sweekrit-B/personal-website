# Sweekrit Bhatnagar — Personal Website

Personal portfolio site built with React 19, TypeScript, and Vite. Deployed to GitHub Pages.

## Pages

- **Home** — hero intro with an interactive 3D flip card (Pokemon-themed selector row) and social links.
- **Projects** — list of projects with expandable detail dropdowns (GitHub repo card, YouTube/paper embeds, skills). The Mars Rover project includes a live 3D URDF model viewer.
- **Resume** — work experience list with company logos, pulled the same way as Projects.

## Content data

Page content is data-driven, not hardcoded — edit these files to update the site without touching components:

- `public/lib/project.json` — project list (title, year, description, skills, links, video/paper embeds)
- `public/lib/resume.json` — education + experience entries
- `public/lib/rover-showcase.json` — Mars Rover project steps/detail content
- `public/gifs/` — Pokemon sprite GIFs used by the 3D card selector
- `public/company-logos/` — logos shown next to resume entries

## Stack

- React 19 + TypeScript + Vite
- `react-router-dom` for routing between Home / Projects / Resume
- `framer-motion` for hover/tap/scroll-reveal animations
- `three` + `urdf-loader` for the Mars Rover URDF viewer (lazy-loaded)
- Plain CSS (`src/App.css`), no CSS framework

## Development

```bash
npm install
npm run dev       # start local dev server
npm run lint      # eslint
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # preview the production build locally
```

## Deployment

```bash
npm run deploy
```

This runs `predeploy` (`npm run build`) and publishes `dist/` to the `gh-pages` branch via the `gh-pages` package. The site is served at the `base` path configured in `vite.config.ts` (`/personal-website/`).

## Misc

- `public/oneko.js` / `public/oneko.gif` — a cat that follows your cursor around the page ([oneko.js](https://github.com/adryd325/oneko.js)), loaded via a plain `<script>` tag in `index.html`.
