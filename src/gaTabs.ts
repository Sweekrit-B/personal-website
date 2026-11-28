// Demo only: the General Atomics card's model tabs, one per surrogate tested, each its whole pipeline (data → model → prediction),
// plus a Results tab. Facts from general-atomics-fusion: scandb_tglf_prediction_training.ipynb (ridge, random forest, XGBoost,
// MLP on the 5,000-run scan; Tables 1 and 3) and d3d_surrogate.ipynb (TGLFNN, minimal and linear quantile ensembles; Table 1).
import { renderRoverTabs, type Tab } from './roverTabs'
import { H, box, cyl, arrow, key, HEAD, gaModelsFigure } from './diagrams'

declare global {
  interface Window {
    renderGaTabs?: (host: HTMLElement) => void
  }
}

type Pt = [number, number]
const svg = (h: number, label: string, body: string) =>
  `<svg class="ml-fig hv" viewBox="0 0 1000 ${h}" role="img" aria-label="${label}">${HEAD}${body}</svg>`
const FLUX = ['Q_i', 'Q_e', 'Γ_e']
// The inputs the DIII-D quantile models keep after preprocessing (q and shear join them after retraining).
const D3D_INPUTS = ['r/a', 'XNUE', 'RLNS_e', 'RLTS_e', 'RLTS_i', 'TAUS_i']

// A fully connected network: columns of nodes, every node joined to the next column.
type Layer = { n: number; label: string; cls: string; faint?: boolean; gap?: number; names?: string[] }
function net(layers: Layer[], x0: number, x1: number, cy: number, labelY: number) {
  const xs = layers.map((_, i) => x0 + ((x1 - x0) * i) / (layers.length - 1))
  const cols: Pt[][] = layers.map((l, i) => Array.from({ length: l.n }, (_, k) => {
    // nine quantile outputs sit in three groups of three, one group per flux
    const grouped = l.n === 9 ? Math.floor(k / 3) * 8 - 8 : 0
    return [xs[i], cy + (k - (l.n - 1) / 2) * (l.gap ?? 12) + grouped] as Pt
  }))
  const edges = cols.slice(1).map((c, i) =>
    `<path class="edge${layers[i + 1].faint ? ' faint' : ''}" d="${c.map(([x2, y2]) => cols[i].map(([x1, y1]) => `M${x1} ${y1}L${x2} ${y2}`).join('')).join('')}"/>`).join('')
  const nodes = cols.map((c, i) => c.map(([x, y]) => `<circle class="${layers[i].cls}${layers[i].faint ? ' faint' : ''}" cx="${x}" cy="${y}" r="5"/>`).join('')).join('')
  const names = layers.map((l, i) => (l.names || []).map((t, k) =>
    `<text class="t-muted" x="${xs[i] - 12}" y="${cols[i][k][1] + 4}" text-anchor="end">${t}</text>`).join('')).join('')
  const labels = layers.map((l, i) => `<text class="t-muted" x="${xs[i]}" y="${labelY}" text-anchor="middle">${l.label}</text>`).join('')
  return { svg: edges + nodes + names + labels, cols }
}
// Flux labels beside the output column: one node per flux, or three (p5, p50, p95) per flux.
const fluxLabels = (col: Pt[], perFlux: number) =>
  FLUX.map((t, g) => `<text class="t-muted" x="${col[0][0] + 14}" y="${col[g * perFlux + (perFlux - 1) / 2][1] + 4}">${t}</text>`).join('')

// Point models (ridge, MLP): scan runs → network → one prediction per flux.
function pointFigure(layers: Layer[], label: string) {
  const cy = 96
  const { svg: s, cols } = net(layers, 230, 700, cy, cy + 74)
  return svg(186, label,
    cyl(20, cy - 28, 116, 56, '5,000 scan runs', 'src') + arrow(`M136 ${cy} H196`) + s + fluxLabels(cols[cols.length - 1], 1) +
    arrow(`M752 ${cy} H802`) + box(804, cy - H / 2, 176, 'Prediction', 'one value per flux', 'out')) +
    key([['--after', 'data'], ['--before', 'model'], ['--hv-teal', 'output']])
}
const ridgeFigure = () => pointFigure([{ n: 7, label: 'scaled inputs', cls: 'src' }, { n: 3, label: 'Σ w·x + b  (L2, α = 1)', cls: 'model', gap: 22 }],
  'Ridge regression: 5,000 scan runs; every scaled input is weighted and summed into each of the three fluxes, with an L2 penalty of alpha 1.0.')
const mlpFigure = () => pointFigure([
  { n: 7, label: 'scaled inputs', cls: 'src' },
  { n: 8, label: 'ReLU · dropout', cls: 'model' },
  { n: 8, label: 'ReLU · dropout', cls: 'model' },
  { n: 8, label: '3rd (if tuned)', cls: 'model', faint: true },
  { n: 3, label: 'linear', cls: 'out', gap: 22 },
], 'MLP point model: 5,000 scan runs; scaled inputs pass through two or three fully connected ReLU layers of 32, 64 or 128 units with dropout, then a linear layer to the three fluxes.')

// Quantile ensembles: DIII-D runs → five seeded networks → averaged quantiles → median ± 90%.
function quantileFigure(hidden: Layer[], label: string) {
  const cy = 132
  const layers: Layer[] = [{ n: 6, label: 'inputs', cls: 'src', gap: 18, names: D3D_INPUTS }, ...hidden, { n: 9, label: 'p5 · p50 · p95', cls: 'out' }]
  const { svg: s, cols } = net(layers, 330, 700, cy, cy + 70)
  const frames = [4, 3, 2, 1, 0].map((k) => `<rect class="grid" x="${170 + k * 6}" y="${54 - k * 6}" width="600" height="158" rx="3" style="fill:var(--surface)"/>`).join('')
  return svg(226, label,
    cyl(20, cy - 28, 116, 56, 'DIII-D runs', 'src') + arrow(`M136 ${cy} H168`) +
    `<text class="t-axis" x="170" y="18">FIVE NETWORKS · ONE PER SEED</text>` + frames + s + fluxLabels(cols[cols.length - 1], 3) +
    arrow(`M794 ${cy} H818`) + box(820, cy - H / 2, 160, 'Median ± 90%', 'seeds averaged', 'out')) +
    key([['--after', 'data · inputs'], ...(hidden.length ? [['--before', 'hidden units'] as [string, string]] : []), ['--hv-teal', 'quantile outputs']])
}
const tglfnnFigure = () => quantileFigure([
  { n: 8, label: '64 · GELU', cls: 'model' }, { n: 8, label: '64 · GELU', cls: 'model' }, { n: 5, label: '8 · ReLU', cls: 'model' },
], 'TGLFNN quantile ensemble: DIII-D runs; six inputs pass through two 64-unit GELU layers and an 8-unit ReLU bottleneck to 9 outputs, the 5th, 50th and 95th percentile of each flux. Five seeds are averaged into a median with a 90% interval.')
const minimalFigure = () => quantileFigure([{ n: 8, label: '60 · ReLU', cls: 'model' }],
  'Minimal quantile ensemble: DIII-D runs; one hidden layer of 60 ReLU units between the six inputs and the 9 quantile outputs, five seeds averaged into a median with a 90% interval.')
const linearFigure = () => quantileFigure([],
  'Linear quantile ensemble: DIII-D runs; a single linear map from the six inputs to the 9 quantile outputs, five seeds averaged into a median with a 90% interval.')

// A small binary decision tree: split nodes, then leaf values.
function tree(x: number, y: number) {
  const n: Pt[] = [[x + 40, y], [x + 20, y + 28], [x + 60, y + 28], [x + 10, y + 56], [x + 30, y + 56], [x + 50, y + 56], [x + 70, y + 56]]
  const e = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]].map(([a, b]) => `M${n[a][0]} ${n[a][1]}L${n[b][0]} ${n[b][1]}`).join('')
  return `<path class="edge" d="${e}"/>` + n.map(([cx, cy], i) => `<circle class="${i > 2 ? 'out' : 'model'}" cx="${cx}" cy="${cy}" r="5"/>`).join('')
}
const treeKey = (combine: string) => key([['--after', 'data'], ['--before', 'split'], ['--hv-teal', 'leaf value'], ['--hv-purple', combine]])

function forestFigure() {
  const xs = [220, 370, 560], root = 70, mid = 98, top = 44, bottom = 172
  return svg(196, 'Random forest: each tree grows on its own bootstrap sample of the 5,000 scan runs; the forest averages the trees into one prediction per flux.',
    cyl(20, mid - 28, 116, 56, '5,000 scan runs', 'src') +
    `<path class="flow" d="M136 ${mid} H170 V${top} H${xs[2] + 40}"/>` +
    xs.map((x) => arrow(`M${x + 40} ${top} V${root - 8}`)).join('') +
    `<text class="t-muted" x="${(xs[0] + xs[2]) / 2 + 40}" y="${top - 8}" text-anchor="middle">a bootstrap sample each</text>` +
    xs.map((x, i) => tree(x, root) + `<text class="t-muted" x="${x + 40}" y="${root + 78}" text-anchor="middle">${i === 2 ? 'tree N' : `tree ${i + 1}`}</text>`).join('') +
    `<text class="t-box" x="${(xs[1] + xs[2]) / 2 + 40}" y="${root + 32}" text-anchor="middle">⋯</text>` +
    xs.map((x) => `<path class="flow" d="M${x + 40} ${root + 86} V${bottom}"/>`).join('') +
    `<path class="flow" d="M${xs[0] + 40} ${bottom} H760"/>` + arrow(`M760 ${bottom} V${mid + H / 2 + 2}`) +
    box(705, mid - H / 2, 110, 'Average', '', 'step') + arrow(`M815 ${mid} H836`) + box(838, mid - H / 2, 142, 'Prediction', 'one value per flux', 'out')) +
    treeKey('average')
}

function boostFigure() {
  const xs = [190, 400, 610], root = 70, mid = 98
  return svg(170, 'XGBoost: trees are added one at a time on the 5,000 scan runs, each fitting the residual error left by the trees before it; their scaled sum is the prediction.',
    cyl(20, mid - 28, 116, 56, '5,000 scan runs', 'src') + arrow(`M136 ${mid} H184`) +
    xs.map((x, i) => tree(x, root) + `<text class="t-muted" x="${x + 40}" y="${root + 78}" text-anchor="middle">${i === 2 ? 'tree N' : `tree ${i + 1}`}</text>`).join('') +
    xs.slice(1).map((x) => arrow(`M${x - 126} ${mid} H${x - 6}`) + `<text class="t-muted" x="${x - 66}" y="${mid - 10}" text-anchor="middle">fits residuals</text>`).join('') +
    arrow(`M690 ${mid} H722`) + box(724, mid - H / 2, 96, 'Sum', '', 'step') + arrow(`M820 ${mid} H836`) + box(838, mid - H / 2, 142, 'Prediction', 'one value per flux', 'out')) +
    treeKey('sum')
}

// Results: R² per model, as two panels because the two groups were tested on different data (one axis each, 0 to 1).
type Bar = { name: string; r2: number; lo?: number; hi?: number; note?: string; chosen?: boolean }
// Both panels share one layout: same bar width, row height and axis baseline (sized for the longer panel), a note under each.
const P = { top: 54, row: 34, rows: 4, bar: 16, labelW: 108, W: 290 }
const axisY = P.top + P.rows * P.row
function barPanel(x: number, title: string, bars: Bar[], note: string) {
  const LX = x + P.labelW, sx = (v: number) => LX + v * P.W
  const grid = [0, 0.5, 1].map((v) => `<line class="bar-grid" x1="${sx(v)}" y1="${P.top - 8}" x2="${sx(v)}" y2="${axisY}"/>` +
    `<text class="t-muted" x="${sx(v)}" y="${axisY + 18}" text-anchor="middle">${v}</text>`).join('')
  const rows = bars.map((b, i) => {
    const y = P.top + i * P.row, mid = y + P.bar / 2
    const tip = `${b.name}: R² ${b.r2.toFixed(2)}${b.lo !== undefined ? ` (fluxes ${b.lo.toFixed(2)}–${b.hi!.toFixed(2)})` : ''}${b.note ? `, ${b.note}` : ''}`
    const whisker = b.lo !== undefined ? `<path class="bar-whisker" d="M${sx(b.lo)} ${mid}H${sx(b.hi!)}M${sx(b.lo)} ${mid - 5}V${mid + 5}M${sx(b.hi!)} ${mid - 5}V${mid + 5}"/>` : ''
    return `<g><title>${tip}</title>` +
      `<text class="t-muted" x="${LX - 12}" y="${mid + 4}" text-anchor="end">${b.name}${b.note ? '*' : ''}</text>` +
      `<rect class="bar${b.chosen ? ' chosen' : ''}" x="${LX}" y="${y}" width="${b.r2 * P.W}" height="${P.bar}" rx="2"/>` + whisker +
      `<text class="t-box" x="${sx(b.hi ?? b.r2) + 10}" y="${mid + 4}">${b.r2.toFixed(2)}</text>` +
      `<rect x="${x}" y="${y - 9}" width="440" height="${P.row}" fill="transparent"/></g>`
  }).join('')
  return `<text class="t-axis" x="${x}" y="24">${title}</text>` + grid + rows +
    `<text class="t-muted" x="${x}" y="${axisY + 46}">${note}</text>`
}
function resultsFigure() {
  return svg(axisY + 58, 'Test R² by model, higher is better. On the 5,000-run scan: MLP 0.89, XGBoost 0.85, random forest 0.69, and ridge 0.50 on the validation set. On the DIII-D runs, mean over the three fluxes: TGLFNN 0.86 (0.79 to 0.94), minimal 0.80 (0.70 to 0.91), linear 0.47 (0.42 to 0.54).',
    barPanel(20, '5,000-RUN SCAN · TEST R²', [
      { name: 'MLP', r2: 0.888, chosen: true }, { name: 'XGBoost', r2: 0.850 }, { name: 'Random forest', r2: 0.688 }, { name: 'Ridge', r2: 0.498, note: 'validation set' },
    ], '* validation set (no test score)') +
    barPanel(540, 'DIII-D RUNS · TEST R², MEAN OF 3 FLUXES', [
      { name: 'TGLFNN', r2: 0.860, lo: 0.788, hi: 0.940, chosen: true }, { name: 'Minimal', r2: 0.795, lo: 0.698, hi: 0.905 }, { name: 'Linear', r2: 0.467, lo: 0.415, hi: 0.540 },
    ], 'whiskers: range across the three fluxes')) +
    key([['--before', 'model'], ['--hv-teal', 'best in its group']])
}

const GA_TABS: Tab[] = [
  { id: 'overview', label: 'Overview', figure: gaModelsFigure },
  { id: 'ridge', label: 'Ridge', figure: ridgeFigure },
  { id: 'forest', label: 'Random forest', figure: forestFigure },
  { id: 'xgb', label: 'XGBoost', figure: boostFigure },
  { id: 'mlp', label: 'MLP', figure: mlpFigure },
  { id: 'tglfnn', label: 'TGLFNN', figure: tglfnnFigure },
  { id: 'minimal', label: 'Minimal', figure: minimalFigure },
  { id: 'linear', label: 'Linear', figure: linearFigure },
  { id: 'results', label: 'Results', figure: resultsFigure },
]

window.renderGaTabs = (host) => renderRoverTabs(host, null, GA_TABS, 'Models tested')
