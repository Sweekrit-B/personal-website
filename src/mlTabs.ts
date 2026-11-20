// Demo only: the ML From Scratch (C++) card's tabs. Facts come from github.com/Sweekrit-B/cpp-ml-scratch
// (main @ f436479): the model sources, their READMEs' benchmark notes, and multilayer-perceptron/src/main.cpp.
import { renderRoverTabs, type Tab } from './roverTabs'

declare global {
  interface Window {
    renderMlTabs?: (host: HTMLElement) => void
  }
}

type Pt = [number, number]
const circle = ([x, y]: Pt, r: number, cls: string, delay?: number) =>
  `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"${delay === undefined ? '' : ` style="animation-delay:${delay.toFixed(2)}s"`}/>`
const column = (x: number, n: number, mid: number, gap: number): Pt[] => Array.from({ length: n }, (_, i) => [x, mid + (i - (n - 1) / 2) * gap])
const edges = (a: Pt[], b: Pt[], cls: string, delay?: number) =>
  `<g class="${cls}"${delay === undefined ? '' : ` style="animation-delay:${delay.toFixed(2)}s"`}>${a.flatMap(([x1, y1]) => b.map(([x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`)).join('')}</g>`

/* ---------- Models: each model is the previous one plus one piece (the new piece in blue) ---------- */
function ladderPanel(kind: 'lin' | 'log' | 'soft' | 'mlp') {
  const MID = 62, R = 7
  const x = column(28, 3, MID, 26)
  const hidden = kind === 'mlp' ? column(92, 4, MID, 22) : []
  const outX = kind === 'mlp' ? 156 : 150
  const out = kind === 'soft' || kind === 'mlp' ? column(outX, 3, MID, 26) : [[outX, MID] as Pt]
  // A forward sweep lights each layer in turn.
  const layers = [x, ...(hidden.length ? [hidden] : []), out]
  const glow = layers.map((l, i) => l.map((p) => circle(p, R, 'pulse', i * 0.35)).join('')).join('')
  const parts = {
    lin: { title: 'Linear', label: 'x · w' },
    log: { title: 'Logistic', label: 'σ' },
    soft: { title: 'Softmax', label: 'softmax' },
    mlp: { title: 'MLP', label: 'ReLU' },
  }[kind]
  const box = (kind === 'soft' || kind === 'mlp') ? `<rect class="${kind === 'soft' ? 'new' : 'grp'}" x="${outX - 14}" y="${MID - 40}" width="28" height="80" rx="14"/>` : ''
  const labelX = kind === 'mlp' ? 92 : outX
  const svg = `<svg class="ml-fig ml-ladder-svg" viewBox="0 0 184 136" role="img" aria-label="${parts.title}">
    ${hidden.length ? edges(x, hidden, 'edge') + edges(hidden, out, 'edge') : edges(x, out, 'edge')}
    ${box}
    ${x.map((p) => circle(p, R, 'node')).join('')}
    ${hidden.map((p) => circle(p, R, 'node new')).join('')}
    ${out.map((p) => circle(p, R, kind === 'log' ? 'node new' : 'node')).join('')}
    ${glow}
    <text class="t-muted${kind === 'lin' ? '' : ' is-new'}" x="${labelX}" y="128" text-anchor="middle">${parts.label}</text>
  </svg>`
  return `<figure class="rv-navpanel"><figcaption><b>${parts.title}</b></figcaption>${svg}</figure>`
}
const ladderFigure = () => `<div class="ml-ladder">${(['lin', 'log', 'soft', 'mlp'] as const).map(ladderPanel).join('')}</div>`

/* ---------- MLP: forward pass right, gradients back left ---------- */
function mlpFigure() {
  const MID = 104, R = 6.5
  const layers = [
    { n: 5, size: '784', name: 'input', more: true },
    { n: 5, size: '16', name: 'ReLU' },
    { n: 7, size: '32', name: 'ReLU' },
    { n: 5, size: '16', name: 'ReLU' },
    { n: 5, size: '10', name: 'softmax', more: true },
  ]
  const X = (i: number) => 60 + i * 120
  const cols = layers.map((l, i) => column(X(i), l.n, MID, 22))
  const STEP = 0.3, BACK = 2.2 // seconds between layers; when the backward sweep starts
  let art = ''
  cols.forEach((c, i) => {
    if (i < cols.length - 1) art += edges(c, cols[i + 1], 'edge') + edges(c, cols[i + 1], 'edge fwd', i * STEP + STEP / 2) + edges(c, cols[i + 1], 'edge bwd', BACK + (cols.length - 2 - i) * STEP + STEP / 2)
  })
  cols.forEach((c, i) => {
    art += c.map((p) => circle(p, R, 'node')).join('')
    art += c.map((p) => circle(p, R, 'pulse', i * STEP)).join('')
    art += c.map((p) => circle(p, R, 'pulse bwd', BACK + (cols.length - 1 - i) * STEP)).join('')
    if (layers[i].more) art += `<text class="t-muted" x="${X(i)}" y="${MID + 66}" text-anchor="middle">⋮</text>`
    art += `<text class="t-muted" x="${X(i)}" y="16" text-anchor="middle">${layers[i].name}</text>`
    art += `<text class="t-box" x="${X(i)}" y="204" text-anchor="middle">${layers[i].size}</text>`
  })
  return `<figure class="rv-navpanel"><svg class="ml-fig" viewBox="0 0 600 212" role="img" aria-label="A multilayer perceptron for MNIST: 784 inputs, hidden layers of 16, 32 and 16 ReLU units, and a 10-way softmax output. The forward pass lights each layer left to right; the gradient then flows back right to left.">${art}</svg></figure>
  <div class="rv-key"><span><i></i>forward pass</span><span><i class="k-grad"></i>gradient (backpropagation)</span></div>`
}

const ML_TABS: Tab[] = [
  {
    id: 'models',
    label: 'Models',
    lead: 'Four models on one hand-written matrix library.',
    points: [
      "Linear regression: ridge normal equation via my own Gauss–Jordan inverse, $69K RMSE",
      "Logistic regression: 94.95% on a hard MNIST digit pair; softmax 90.15% on all ten",
      "The MLP puts ReLU layers in front of the same softmax",
      "Flat-block matrix storage cut MNIST softmax training from 30.5s to 19.7s",
    ],
    figure: ladderFigure,
  },
  {
    id: 'mlp',
    label: 'MLP',
    lead: 'Built backpropagation by hand.',
    points: [
      "Hidden layers of 16, 32 and 16 ReLU units into a 10-way softmax",
      "The forward pass caches each layer's input and pre-activation",
      "The backward pass carries the cross-entropy gradient back one layer at a time",
      "L2 regularization and mini-batch training",
    ],
    figure: mlpFigure,
  },
]

window.renderMlTabs = (host) => renderRoverTabs(host, null, ML_TABS, 'ML from scratch')
