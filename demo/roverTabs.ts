// Demo only: the Mars Rover card's five tabs. Facts come from the experience list / resume;
// waypoints are copied from the sim console log in sim-auton-console.png (recorded 02/2026).

declare global {
  interface Window {
    renderRoverTabs?: (host: HTMLElement, viewer: HTMLElement | null) => void
  }
}
type ViewerHost = HTMLElement & { _overlay?: (id: string | null) => void }


// Planner output from the sim console: relative waypoints [forward, lateral].
export const LOGGED_PATHS: [number, number][][] = [
  [[0, 0.5], [1, -0.75], [2.25, -1], [3.75, -1]],
  [[0, 0.5], [1, 1.5], [2.25, 1.75], [3.75, 1.75]],
]
// The same paths shifted sideways so each starts at the rover's front centre (shape unchanged).
export const FRONT_PATHS: [number, number][][] = LOGGED_PATHS.map((p) => p.map(([f, l]) => [f, l - p[0][1]] as [number, number]))

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/* ---------- Navigation figure: BFS vs the logged Theta* path, same grid ---------- */
// Grid at 0.25 spacing (the logged waypoints are all multiples of 0.25). Forward 0..4, lateral -1.5..2.25.
const STEP = 0.25
const F_MAX = 4, L_MIN = -2, L_MAX = 1.75
const START: [number, number] = [0, 0]
const GOAL: [number, number] = [3.75, -1.5]
// Obstacle footprint (illustrative; placed where both logged replans steer around it).
const OBST = { f0: 1.5, f1: 3.5, l0: -0.75, l1: 0.75 }
const blocked = (f: number, l: number) => f >= OBST.f0 && f <= OBST.f1 && l >= OBST.l0 && l <= OBST.l1

// Plain BFS on the 4-connected grid: returns the visit order and the route, every cell a waypoint.
function bfs() {
  const key = (f: number, l: number) => `${f.toFixed(2)},${l.toFixed(2)}`
  const prev = new Map<string, string | null>([[key(...START), null]])
  const order: [number, number][] = []
  const queue: [number, number][] = [START]
  while (queue.length) {
    const [f, l] = queue.shift()!
    order.push([f, l])
    if (key(f, l) === key(...GOAL)) break
    for (const [df, dl] of [[STEP, 0], [0, -STEP], [0, STEP], [-STEP, 0]]) {
      const nf = +(f + df).toFixed(2), nl = +(l + dl).toFixed(2)
      if (nf < 0 || nf > F_MAX || nl < L_MIN || nl > L_MAX || blocked(nf, nl) || prev.has(key(nf, nl))) continue
      prev.set(key(nf, nl), key(f, l))
      queue.push([nf, nl])
    }
  }
  const route: [number, number][] = []
  for (let k: string | null | undefined = key(...GOAL); k; k = prev.get(k)) route.unshift(k.split(',').map(Number) as [number, number])
  return { order, route }
}
// The BFS route on the same grid, for the 3D overlay.
export const bfsRoute = () => bfs().route

function navPanel(kind: 'bfs' | 'theta') {
  const X = (f: number) => 26 + f * 100
  const Y = (l: number) => 34 + (L_MAX - l) * 60
  const pts = (p: [number, number][]) => p.map(([f, l]) => `${X(f).toFixed(1)},${Y(l).toFixed(1)}`).join(' ')
  const grid: string[] = []
  for (let f = 0; f <= F_MAX + 1e-6; f += STEP) grid.push(`<line x1="${X(f)}" y1="${Y(L_MAX)}" x2="${X(f)}" y2="${Y(L_MIN)}" class="${Math.abs(f % 1) < 1e-6 ? 'g1' : 'g'}"/>`)
  for (let l = L_MIN; l <= L_MAX + 1e-6; l += STEP) grid.push(`<line x1="${X(0)}" y1="${Y(l)}" x2="${X(F_MAX)}" y2="${Y(l)}" class="${Math.abs(l % 1) < 1e-6 ? 'g1' : 'g'}"/>`)
  const cell = STEP * 100, cellH = STEP * 60
  let explored = ''
  let route: [number, number][]
  if (kind === 'bfs') {
    const r = bfs()
    route = r.route
    // Searched cells fade in in visit order.
    explored = r.order.map(([f, l], i) => `<rect class="seen" x="${(X(f) - cell / 2).toFixed(1)}" y="${(Y(l) - cellH / 2).toFixed(1)}" width="${cell}" height="${cellH}" style="animation-delay:${i * 4}ms"/>`).join('')
  } else {
    route = FRONT_PATHS[0]
  }
  const drawDelay = kind === 'bfs' ? 1.1 : 0.2
  const dots = route.map(([f, l], i) => `<circle class="wp" cx="${X(f)}" cy="${Y(l)}" r="${kind === 'bfs' ? 3 : 5}" style="animation-delay:${(drawDelay + (i / route.length) * 1.2).toFixed(2)}s"/>`).join('')
  const label = kind === 'bfs'
    ? `Breadth-first search on a 4-connected grid: it searches outward cell by cell, and its route around the obstacle has ${route.length} waypoints, one per cell.`
    : 'Theta* route logged by the rover planner: 4 waypoints joined by straight any-angle segments around the obstacle.'
  const svg = `<svg class="rv-nav" viewBox="0 0 452 286" role="img" aria-label="${label}">
    <g class="grid">${grid.join('')}</g>
    <g>${explored}</g>
    <rect class="obst" x="${X(OBST.f0) - cell / 2}" y="${Y(OBST.l1) - cellH / 2}" width="${X(OBST.f1) - X(OBST.f0) + cell}" height="${Y(OBST.l0) - Y(OBST.l1) + cellH}" rx="10"/>
    <polyline class="path ${kind === 'bfs' ? 'path-bfs' : 'path-a'}" style="animation-delay:${drawDelay}s" points="${pts(route)}"/>
    ${dots}
    <rect class="rover" x="${X(START[0]) - 22}" y="${Y(START[1]) - 11}" width="22" height="22" rx="3"/>
    <path class="goal" d="M${X(GOAL[0])} ${Y(GOAL[1]) + 8}V${Y(GOAL[1]) - 14}l10 4-10 4"/>
  </svg>`
  const title = kind === 'bfs' ? 'BFS, the old planner' : 'Theta*'
  const note = kind === 'bfs' ? `${route.length} waypoints, one per cell` : `${route.length} waypoints, logged Feb 2026`
  return `<figure class="rv-navpanel is-${kind}"><figcaption><b>${title}</b><span>${note}</span></figcaption>${svg}</figure>`
}

function navFigure() {
  return `<div class="rv-navpair">${navPanel('bfs')}${navPanel('theta')}</div>`
}

/* ---------- Localization figure: GPS only vs GPS + RTCM, fixes arriving at 10 Hz ---------- */
function locPanel(kind: 'gps' | 'rtk') {
  const C = [226, 140]
  const sigma = kind === 'gps' ? 34 : 4 // spread is illustrative; same ring scale in both panels
  let seed = kind === 'gps' ? 11 : 29
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  // 40 fixes, one every 100 ms, on a 4 s loop: a steady 10 Hz stream.
  const dots = Array.from({ length: 40 }, (_, i) => {
    const x = C[0] + gauss() * sigma, y = C[1] + gauss() * sigma
    return `<circle class="fix" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" style="animation-delay:${(i * 0.1).toFixed(1)}s"/>`
  }).join('')
  const rings = [30, 60, 90].map((r) => `<circle class="ring" cx="${C[0]}" cy="${C[1]}" r="${r}"/>`).join('')
  const svg = `<svg class="rv-loc" viewBox="0 0 452 286" role="img" aria-label="${kind === 'gps'
    ? 'Position fixes from satellite GPS alone, scattered widely around the target waypoint.'
    : 'Position fixes with RTCM corrections, packed tightly on the target waypoint.'}">
    ${rings}
    <line class="cross" x1="${C[0] - 108}" y1="${C[1]}" x2="${C[0] + 108}" y2="${C[1]}"/>
    <line class="cross" x1="${C[0]}" y1="${C[1] - 108}" x2="${C[0]}" y2="${C[1] + 108}"/>
    ${dots}
    <circle class="target" cx="${C[0]}" cy="${C[1]}" r="6"/>
  </svg>`
  const title = kind === 'gps' ? 'GPS alone' : 'GPS with RTCM corrections'
  const note = kind === 'gps' ? 'fixes scatter' : 'fixes land on the waypoint'
  return `<figure class="rv-navpanel is-${kind}"><figcaption><b>${title}</b><span>${note}</span></figcaption>${svg}</figure>`
}

function locFigure() {
  return `<div class="rv-navpair">${locPanel('gps')}${locPanel('rtk')}</div>`
}

/* ---------- Dev workflow figure: the loop one code change goes around, before and after the sim ---------- */
// A closed loop out of the laptop's right edge to a box's left edge at height y, and back.
const loopTo = (y: number) => `M122 74 C150 74 150 ${y - 9} 178 ${y - 9} L178 ${y + 9} C150 ${y + 9} 150 96 122 96 Z`
// One dot that goes round `path` every `dur` seconds, slowing to a crawl while it sits at the far box.
const token = (path: string, dur: number, cls: string, wait: boolean) =>
  `<circle class="tok ${cls}" r="3.5"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"${wait ? ' keyPoints="0;0.42;0.58;1" keyTimes="0;0.2;0.8;1" calcMode="linear"' : ''}/></circle>`

function devPanel(kind: 'old' | 'new') {
  const box = (x: number, y: number, title: string, sub: string, cls = '') =>
    `<rect class="box ${cls}" x="${x}" y="${y}" width="110" height="46"/><text class="t-box" x="${x + 10}" y="${y + 19}">${title}</text><text class="t-muted" x="${x + 10}" y="${y + 35}">${sub}</text>`
  const rover = kind === 'old' ? loopTo(85) : loopTo(129)
  const simLoop = loopTo(41)
  const art =
    kind === 'old'
      ? `<path class="lane" d="${rover}"/>${box(12, 62, 'Laptop', 'ROS1, by hand')}${box(178, 62, 'Rover', 'wait for slot', 'is-hw')}${token(rover, 6, 'tok-hw', true)}`
      : `<path class="lane" d="${simLoop}"/><path class="lane" d="${rover}"/>${box(12, 62, 'Laptop', 'Docker, ROS2')}${box(178, 18, 'Webots', 'test in sim', 'is-sim')}${box(178, 106, 'Rover', 'final checks', 'is-hw')}` +
        `${token(simLoop, 2, 'tok-sim', false)}${token(rover, 6, 'tok-hw', true)}`
  const label =
    kind === 'old'
      ? 'Before: every edit goes from the laptop to the physical rover and waits there before it can be tested.'
      : 'After: edits loop quickly between the laptop and the Webots simulation; the rover is visited only for final checks.'
  const title = kind === 'old' ? 'Before' : 'After'
  const note = kind === 'old' ? 'every change waits on the rover' : 'iterate in sim, rover for final checks'
  return `<figure class="rv-navpanel is-${kind}"><figcaption><b>${title}</b><span>${note}</span></figcaption><svg class="rv-dev" viewBox="0 0 300 170" role="img" aria-label="${label}">${art}</svg></figure>`
}

function devFigure() {
  return `<div class="rv-navpair">${devPanel('old')}${devPanel('new')}</div>`
}

/* ---------- Science figure: an assay trace cleaned and peak-picked (illustrative) ---------- */
function scienceFigure() {
  const N = 90
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const clean = Array.from({ length: N }, (_, i) => 0.18 + 0.55 * Math.exp(-(((i - 56) / 9) ** 2)) + 0.12 * Math.exp(-(((i - 24) / 6) ** 2)))
  const raw = clean.map((v, i) => v + (rnd() - 0.5) * 0.12 + (i === 40 || i === 71 ? 0.38 : 0))
  const X = (i: number) => 20 + (i / (N - 1)) * 560
  const Y = (v: number) => 200 - v * 210
  const line = (a: number[]) => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
  return `<svg class="rv-sci" viewBox="0 0 600 214" role="img" aria-label="Illustrative fluorescence trace: a noisy raw signal with two outlier spikes, the smoothed signal over it, and the detected peak marked.">
    <line class="g1" x1="20" y1="200" x2="580" y2="200"/>
    <polyline class="raw" points="${line(raw)}"/>
    ${[40, 71].map((i) => `<circle class="outlier" cx="${X(i)}" cy="${Y(raw[i])}" r="5"/>`).join('')}
    <polyline class="smooth" points="${line(clean)}"/>
    <line class="peak" x1="${X(56)}" y1="${Y(clean[56]) - 6}" x2="${X(56)}" y2="200"/>
    <circle class="peak-dot" cx="${X(56)}" cy="${Y(clean[56])}" r="5"/>
    <text class="t-muted" x="${X(56) + 10}" y="${Y(clean[56]) - 6}">peak</text>
    <text class="t-muted" x="${X(71) + 10}" y="${Y(raw[71]) + 4}">outlier removed</text>
    <text class="t-axis" x="580" y="212" text-anchor="end">time →</text>
  </svg>
  <div class="rv-key"><span><i class="k-raw"></i>raw fluorescence</span><span><i class="k-path"></i>smoothed, outliers removed</span></div>`
}

/* ---------- The five tabs ---------- */
// `lead` is the result, `text` the story behind it. Facts only from the resume and experience list.
type Tab = { id: string; label: string; metric: string; lead: string; text: string; figure: () => string }
const TABS: Tab[] = [
  {
    id: 'nav',
    label: 'Navigation',
    metric: '−70%',
    lead: 'Cut path-planning latency by 70%.',
    text: 'During the ROS1 to ROS2 migration, our BFS obstacle avoidance reacted too slowly. I replaced it with Theta*, a graph search over point-cloud data that draws straight lines between waypoints instead of stepping cell by cell.',
    figure: navFigure,
  },
  {
    id: 'cv',
    label: 'Perception',
    metric: '4×',
    lead: 'Made object detection 4× faster.',
    text: 'Detection ran on the main CPU, which was too slow for navigation. I trained a YOLO model for 50+ epochs, quantized it to RKNN and moved it onto the rover’s NPU. It now streams detections of 10+ object types to navigation and takes load off the CPU.',
    figure: () =>
      `<figure class="rv-cnn"><img src="demo/figures/cnn/cnn.svg" alt="A YOLO-style detector: a camera frame passes through convolution and pooling layers into a grid detection head, and the output frame shows the mallet boxed at 0.94 confidence." /><figcaption>The output is a real detection from the 2026 SAR run.</figcaption></figure>` +
      `<div class="rv-speed" aria-label="Relative detection speed"><div><b>CPU</b><i style="--w:25%;--c:var(--before)"></i><em>1×</em></div><div><b>NPU (RKNN)</b><i style="--w:100%;--c:var(--after)"></i><em>4×</em></div></div>`,
  },
  {
    id: 'gnss',
    label: 'Localization',
    metric: '99.8%',
    lead: 'Reached 99.8% positional accuracy.',
    text: 'Satellite GPS alone was too coarse to drive to an exact latitude and longitude. I fused it with RTCM corrections at 10 Hz over a live network link, through MAVROS into ROS, and wrote a custom EKF on the IMU for heading.',
    figure: locFigure,
  },
  {
    id: 'dev',
    label: 'Dev workflow',
    metric: '70%',
    lead: 'Moved 70% of testing off the rover.',
    text: 'Every test used to need the one physical rover, and setting up ROS1 was slow and different on every laptop. I built a ROS2 simulation in Webots that runs 13 rover packages, led the ROS1 to ROS2 migration across 12+ modules, and set up Docker for macOS and Windows plus Foxglove for testing. Developer throughput doubled and onboarding got 3× faster.',
    figure: devFigure,
  },
  {
    id: 'sci',
    label: 'Science',
    metric: '4 tests',
    lead: 'Automated 4 biochemical tests.',
    text: 'The life-detection experiment produced noisy fluorescence data. I wrote the analysis for the Bradford, Nile Red and ATP assays (smoothing, outlier removal, peak detection) and the Arduino firmware that runs the tests on the experiment robot.',
    figure: scienceFigure,
  },
]

const FOOTNOTE =
  'The figures explain each mechanism. The Theta* waypoints, the 10 Hz correction rate and the mallet detection are real logged data. Obstacle shapes, the spread of GPS fixes, the assay trace, layer sizes and dot timing are drawn for comparison.'

function panelHtml(t: Tab) {
  return `<p class="rv-copy"><strong>${esc(t.lead)}</strong> ${esc(t.text)}</p><div class="rv-fig">${t.figure()}</div>`
}

function renderRoverTabs(host: HTMLElement, viewer: HTMLElement | null) {
  const v = viewer as ViewerHost | null
  host.innerHTML = `<div class="rv-tabs" role="tablist" aria-label="Rover work">${TABS.map((t, i) => `<button type="button" role="tab" id="rv-tab-${t.id}" aria-controls="rv-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${t.id}">${t.label} <span>${t.metric}</span></button>`).join('')}</div>
    <div class="rv-panel" id="rv-panel" role="tabpanel"></div>
    <p class="rv-foot">${FOOTNOTE}</p>`
  const panel = host.querySelector<HTMLElement>('.rv-panel')!
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
  const select = (id: string, focus = false) => {
    const t = TABS.find((x) => x.id === id)!
    buttons.forEach((b) => {
      const on = b.dataset.tab === id
      b.setAttribute('aria-selected', String(on))
      b.tabIndex = on ? 0 : -1
      if (on && focus) b.focus()
    })
    panel.setAttribute('aria-labelledby', `rv-tab-${id}`)
    panel.innerHTML = panelHtml(t)
    // SMIL tokens: freeze mid-flow under reduced motion.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches)
      panel.querySelectorAll('svg').forEach((s) => {
        s.setCurrentTime(1.2)
        s.pauseAnimations()
      })
    v?._overlay?.(id)
  }
  buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.tab!)))
  host.querySelector('.rv-tabs')!.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent
    const i = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true')
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[ev.key]
    if (next === undefined) return
    ev.preventDefault()
    select(TABS[(next + TABS.length) % TABS.length].id, true)
  })
  select(TABS[0].id)
}

window.renderRoverTabs = renderRoverTabs
