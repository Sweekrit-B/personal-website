// Demo only (served by Vite dev at /pipeline.html; not part of the site build).
// Rover autonomy pipeline as a field-manual diagram. Facts come from rover-showcase.json and resume.json;
// the "before" state is reconstructed from those notes.
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import oakdUrl from './assets/oakd/oakd_enclosure.stl?url' // official Luxonis OAK-D enclosure (MIT, luxonis/oak-hardware)

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

type Face = { title: string; sub: string; badge?: string; mine?: boolean }
type NodeDef = { id: string; before: Face; after: Face; detail: string }

const NODES: NodeDef[] = [
  {
    id: 'cam',
    before: { title: 'USB camera', sub: 'RGB frames to the main computer' },
    after: { title: 'OAK-D', sub: 'Stereo depth + RGB + IMU', mine: true },
    detail:
      'Replaced slow camera-plus-CPU detection with an OAK-D. Its stereo pair gives depth for the point cloud, its RGB camera feeds detection, and its IMU feeds heading.',
  },
  {
    id: 'npu',
    before: { title: 'Host CPU', sub: 'Detection on the main computer' },
    after: { title: 'On-camera NPU', sub: 'Custom-trained YOLOv6', badge: '10+ object classes', mine: true },
    detail:
      'Built custom-trained YOLOv6 models that run on the OAK-D’s NPU instead of the rover’s CPU, detecting mallets, hammers and ArUco tags and streaming detections to the navigation stack in real time.',
  },
  {
    id: 'gps',
    before: { title: 'GPS', sub: 'Satellite fix only' },
    after: { title: 'RTK GPS', sub: '+ RTCM corrections at 10 Hz', badge: '99.8% positional accuracy', mine: true },
    detail:
      'Combined satellite GPS with a real-time 10 Hz RTCM correction stream over a live network link, first wiring the RTK module through ArduPilot Pixhawk configuration.',
  },
  {
    id: 'ekf',
    before: { title: 'Compass', sub: 'Raw heading' },
    after: { title: 'EKF', sub: 'OAK-D IMU → heading', mine: true },
    detail: 'Integrated the OAK-D’s IMU with a custom extended Kalman filter to improve compass heading accuracy.',
  },
  {
    id: 'bus',
    before: { title: 'ROS', sub: 'Message bus' },
    after: { title: 'ROS2', sub: 'detections · PointCloud2 · position · heading', badge: 'Docker env for 20+ devs', mine: true },
    detail:
      'One of the primary contributors to the team-wide ROS → ROS2 migration, and built the Docker development container used by the 20+ member software team.',
  },
  {
    id: 'plan',
    before: { title: 'BFS planner', sub: 'Grid search' },
    after: { title: 'Theta* planner', sub: 'Any-angle search over PointCloud2', badge: '−70% planning latency', mine: true },
    detail:
      'Rewrote obstacle avoidance from BFS to Theta* over PointCloud2 data. Any-angle paths and fewer expansions cut path-planning latency by 70% and handled constrained terrain better.',
  },
  {
    id: 'drive',
    before: { title: 'Drive', sub: '6 wheels · rocker-bogie' },
    after: { title: 'Drive', sub: '6 wheels · rocker-bogie' },
    detail: 'Six-wheel rocker-bogie drive (from the rover URDF). Receives drive commands from the planner.',
  },
]
const SIM: NodeDef = {
  id: 'sim',
  before: { title: 'Testing on the physical rover', sub: 'Every change needs hardware time' },
  after: {
    title: 'Webots simulation',
    sub: 'The same ROS2 graph runs against a simulated Mars desert',
    badge: '60–70% of testing moved off-rover',
    mine: true,
  },
  detail:
    'Connected the rover stack to a Webots Mars-desert world through a ROS bridge, with a custom URDF and realistic obstacles. Doubled developer throughput and moved 60–70% of testing off the rover.',
}

// [from, to, label, route]
type Route = 'rl' | 'over' | 'rightDown' | 'under' | 'upInto'
const EDGES: [string, string, string, Route][] = [
  ['cam', 'npu', 'RGB frames', 'rl'],
  ['cam', 'bus', 'depth → PointCloud2', 'over'],
  ['cam', 'ekf', 'IMU', 'rightDown'],
  ['npu', 'bus', 'detections', 'rl'],
  ['ekf', 'bus', 'heading', 'rl'],
  ['gps', 'bus', 'position', 'under'],
  ['bus', 'plan', '', 'rl'],
  ['plan', 'drive', 'drive cmds', 'rl'],
  ['sim', 'bus', 'same graph', 'upInto'],
]

/* ---------- Build nodes ---------- */
const grid = document.getElementById('grid')!
const simEl = document.getElementById('n-sim') as HTMLButtonElement
const els = new Map<string, HTMLElement>()
let mode: 'before' | 'after' = 'after'

for (const n of NODES) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'node'
  b.id = `n-${n.id}`
  b.setAttribute('aria-pressed', 'false')
  b.innerHTML = `${n.id === 'cam' ? '<div class="oakd" id="oakd"><span class="note label">USB camera</span></div>' : ''}<div class="body"></div>`
  b.onclick = () => select(n, b)
  grid.appendChild(b)
  els.set(n.id, b)
}
simEl.innerHTML = '<div class="body"></div>'
simEl.onclick = () => select(SIM, simEl)
els.set('sim', simEl)

function paint(n: NodeDef, el: HTMLElement) {
  const f = n[mode]
  el.classList.toggle('mine', !!f.mine)
  el.querySelector('.body')!.innerHTML =
    n.id === 'sim'
      ? `<div><div class="t">${f.title}</div><div class="s">${f.sub}</div></div><div class="badge">${f.badge ?? ''}</div>`
      : `<div class="t">${f.title}</div><div class="s">${f.sub}</div><div class="badge">${f.badge ?? ''}</div>`
}
for (const n of [...NODES, SIM]) paint(n, els.get(n.id)!)

let selected: { n: NodeDef; el: HTMLElement } | null = null
function select(n: NodeDef, el: HTMLElement) {
  for (const e of els.values()) e.setAttribute('aria-pressed', String(e === el))
  selected = { n, el }
  writeCaption()
}
function writeCaption() {
  if (!selected) return
  const { n } = selected
  const f = n[mode]
  document.getElementById('capTitle')!.innerHTML = `<b>${mode === 'after' ? 'After' : 'Before'}</b> — ${f.title}`
  document.getElementById('capBody')!.textContent =
    mode === 'after' ? n.detail : `${f.sub}. Switch to After to see what I changed.`
}

/* ---------- Before / After ---------- */
const mBefore = document.getElementById('m-before')!
const mAfter = document.getElementById('m-after')!
function setMode(m: 'before' | 'after') {
  if (m === mode) return
  mode = m
  mBefore.setAttribute('aria-pressed', String(m === 'before'))
  mAfter.setAttribute('aria-pressed', String(m === 'after'))
  document.getElementById('modeNote')!.textContent =
    m === 'after' ? 'After: the pipeline as I left it' : 'Before: reconstructed from project notes'
  document.body.classList.toggle('before', m === 'before')
  const all = [...NODES, SIM]
  for (const n of all) els.get(n.id)!.classList.add('swap')
  setTimeout(() => {
    for (const n of all) {
      paint(n, els.get(n.id)!)
      els.get(n.id)!.classList.remove('swap')
    }
    writeCaption()
    layoutEdges()
  }, reduced ? 0 : 120)
}
mBefore.onclick = () => setMode('before')
mAfter.onclick = () => setMode('after')

/* ---------- Edges (orthogonal routes from live node boxes) ---------- */
const SVGNS = 'http://www.w3.org/2000/svg'
const svg = document.getElementById('edges') as unknown as SVGSVGElement
const diagram = document.getElementById('diagram')!
type Live = { path: SVGPathElement; len: number; packets: SVGCircleElement[] }
let live: Live[] = []

function box(id: string) {
  const d = diagram.getBoundingClientRect()
  const r = els.get(id)!.getBoundingClientRect()
  const l = r.left - d.left
  const t = r.top - d.top
  return { l, t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2, h: r.height }
}

function route(a: string, b: string, kind: Route): number[][] {
  const A = box(a)
  const B = box(b)
  switch (kind) {
    case 'rl': {
      const ay = a === 'cam' ? A.t + A.h * 0.38 : A.cy
      const by = Math.min(Math.max(ay, B.t + 14), B.b - 14)
      const mx = (A.r + B.l) / 2
      return [[A.r, ay], [mx, ay], [mx, by], [B.l, by]]
    }
    case 'over': {
      const y = Math.min(A.t, B.t) - 22
      return [[A.cx, A.t], [A.cx, y], [B.cx, y], [B.cx, B.t]]
    }
    case 'rightDown': {
      const y0 = A.t + A.h * 0.78
      const mx = A.r + 18
      return [[A.r, y0], [mx, y0], [mx, B.cy], [B.l, B.cy]]
    }
    case 'under': {
      const y = Math.max(A.b, B.b) + 22
      const bx = B.l + (B.r - B.l) * 0.3
      return [[A.cx, A.b], [A.cx, y], [bx, y], [bx, B.b]]
    }
    case 'upInto': {
      const bx = B.l + (B.r - B.l) * 0.7
      return [[bx, A.t], [bx, B.b]]
    }
  }
}

function layoutEdges() {
  svg.replaceChildren()
  live = []
  if (getComputedStyle(svg).display === 'none') return
  for (const [a, b, label, kind] of EDGES) {
    const pts = route(a, b, kind)
    const path = document.createElementNS(SVGNS, 'path')
    path.setAttribute('d', 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L'))
    if (a === 'sim') path.classList.add('dashed')
    svg.appendChild(path)
    const len = path.getTotalLength()

    if (label) {
      // Label sits on the longest segment.
      let best = 0
      let bestLen = -1
      for (let i = 0; i < pts.length - 1; i++) {
        const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
        if (L > bestLen) [best, bestLen] = [i, L]
      }
      const [x0, y0] = pts[best]
      const [x1, y1] = pts[best + 1]
      const t = document.createElementNS(SVGNS, 'text')
      t.textContent = label
      const vertical = Math.abs(x1 - x0) < 1
      t.setAttribute('x', String(vertical ? x0 + 8 : (x0 + x1) / 2))
      t.setAttribute('y', String(vertical ? (y0 + y1) / 2 + 4 : y0 - 7))
      t.setAttribute('text-anchor', vertical ? 'start' : 'middle')
      svg.appendChild(t)
    }

    const packets: SVGCircleElement[] = []
    if (!reduced) {
      for (let i = 0; i < 2; i++) {
        const c = document.createElementNS(SVGNS, 'circle')
        c.setAttribute('r', '2.5')
        c.classList.add('packet')
        svg.appendChild(c)
        packets.push(c)
      }
    }
    live.push({ path, len, packets })
  }
}

// "After" moves data faster than "Before": qualitative only, no invented latencies.
let last = performance.now()
let phase = 0
function tick(now: number) {
  const dt = Math.min(50, now - last) / 1000
  last = now
  phase += dt * (mode === 'after' ? 90 : 38)
  for (const { path, len, packets } of live) {
    packets.forEach((c, i) => {
      const p = path.getPointAtLength((phase + (i * len) / packets.length) % len)
      c.setAttribute('cx', String(p.x))
      c.setAttribute('cy', String(p.y))
    })
  }
  requestAnimationFrame(tick)
}

new ResizeObserver(layoutEdges).observe(diagram)
document.fonts.ready.then(layoutEdges)
requestAnimationFrame(tick)

/* ---------- OAK-D: official enclosure, drawn as line art ---------- */
const host = document.getElementById('oakd')!
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
host.prepend(renderer.domElement)
const scene = new THREE.Scene()
scene.add(new THREE.HemisphereLight(0xaab8cc, 0x0b0e12, 1.6))
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000)
const pivot = new THREE.Group()
pivot.rotation.x = 0.42
scene.add(pivot)

new STLLoader().load(oakdUrl, (g) => {
  g.center() // file is 110 × 54.5 × 33 mm, Y-up
  const fill = new THREE.Mesh(
    g,
    new THREE.MeshLambertMaterial({ color: 0x161c24, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  )
  fill.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 35), new THREE.LineBasicMaterial({ color: 0x8b95a1 })))
  pivot.add(fill)
  pivot.rotation.y = -0.6
  sizeOakd()
})

function sizeOakd() {
  const w = host.clientWidth
  const h = host.clientHeight
  renderer.setSize(w, h)
  const half = 40 // mm; fits the 110 mm width while rotating
  camera.left = (-half * w) / h
  camera.right = (half * w) / h
  camera.top = half
  camera.bottom = -half
  camera.updateProjectionMatrix()
}
new ResizeObserver(sizeOakd).observe(host)

let visible = true
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(host)
renderer.setAnimationLoop((t) => {
  if (!visible) return
  if (!reduced) pivot.rotation.y = -0.6 + Math.sin(t / 2400) * 0.9 // slow sway shows front and side
  renderer.render(scene, camera)
})
