// Demo only (served by Vite dev at /rover-anatomy.html; not part of the site build).
// Real rover URDF + STLs, drawn Anatomy-style: isometric ortho camera, line-art edges,
// mono callouts, explode → reassemble.
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import urdfUrl from '../src/assets/robot.urdf?url'

const stlUrls = import.meta.glob('../src/assets/rover_assets/*.stl', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>
const urlByFile: Record<string, string> = {}
for (const [p, u] of Object.entries(stlUrls)) urlByFile[p.split('/').pop()!] = u

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const ACCENT = new THREE.Color('#4f8fe0')
const LINE = new THREE.Color('#8b95a1')

/* ---------- Part groups (from STL filenames) ---------- */
type Key = 'wheels' | 'hardware' | 'bearings' | 'motors' | 'frame' | 'diff' | 'chassis'
// Leave first → return last.
const ORDER: Key[] = ['wheels', 'hardware', 'bearings', 'motors', 'frame', 'diff', 'chassis']
const INFO: Record<Key, { title: string; detail: (n: number) => string }> = {
  wheels: { title: 'WHEELS ×6', detail: (n) => `${n} parts · hex hubs + treads` },
  hardware: { title: 'PLATES + FASTENERS', detail: (n) => `${n} parts` },
  bearings: { title: 'BEARINGS', detail: (n) => `${n} × 1.125″ bearings` },
  motors: { title: 'DRIVE', detail: (n) => `${n} motors + brackets` },
  frame: { title: 'ROCKER-BOGIE', detail: (n) => `${n} tubes · rocker + bogie arms` },
  diff: { title: 'DIFFERENTIAL', detail: (n) => `${n} parts · diff block + ball joints` },
  chassis: { title: 'CHASSIS', detail: (n) => `${n} panels + brackets` },
}
function groupOf(file: string): Key {
  if (/^part_1|hex_hub/.test(file)) return 'wheels'
  if (/chassis_motor|motor_bracket/.test(file)) return 'motors'
  if (/^tube_/.test(file)) return 'frame'
  if (/back_and_sides|part_3|tubing_bracket/.test(file)) return 'chassis'
  if (/diff_block|balljoint/.test(file)) return 'diff'
  if (/bearing/.test(file)) return 'bearings'
  return 'hardware'
}

type Part = {
  mesh: THREE.Mesh
  key: Key
  base: THREE.Vector3 // assembled position
  c0: THREE.Vector3 // assembled world-space center
  off: THREE.Vector3 // offset at spread = 1
  box: THREE.Box3 // assembled world-space bounds
  delay: number
  e: number // current eased progress
}

/* ---------- Scene ---------- */
const stage = document.getElementById('stage')!
const leads = document.getElementById('leads') as unknown as SVGSVGElement
const calloutsEl = document.getElementById('callouts')!
const loadingEl = document.getElementById('loading')!
const toggle = document.getElementById('toggle') as HTMLButtonElement
const tRange = document.getElementById('tRange') as HTMLInputElement
const spreadRange = document.getElementById('spreadRange') as HTMLInputElement

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
stage.prepend(renderer.domElement)

const scene = new THREE.Scene()
scene.add(new THREE.HemisphereLight(0xaab8cc, 0x0b0e12, 1.6))
const key = new THREE.DirectionalLight(0xffffff, 0.8)
key.position.set(2, 4, 3)
scene.add(key)

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100)
const VIEW_DIR = new THREE.Vector3(1, 0.85, 1.25).normalize()
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false

const fillMat = new THREE.MeshLambertMaterial({
  color: 0x161c24,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
})
const lineMats = Object.fromEntries(
  ORDER.map((k) => [k, new THREE.LineBasicMaterial({ color: LINE.clone(), transparent: true, opacity: 0.9 })]),
) as Record<Key, THREE.LineBasicMaterial>

/* ---------- Load URDF (cache each STL once; many parts reuse the same file) ---------- */
const stl = new STLLoader()
const geomCache = new Map<string, Promise<THREE.BufferGeometry>>()
const edgeCache = new Map<string, THREE.EdgesGeometry>()
const pending: Promise<unknown>[] = []
let loaded = 0

function loadGeom(file: string) {
  if (!geomCache.has(file)) {
    geomCache.set(file, stl.loadAsync(urlByFile[file]).then((g) => (g.computeVertexNormals(), g)))
  }
  return geomCache.get(file)!
}

const urdfLoader = new URDFLoader()
urdfLoader.packages = { assets: '' }
urdfLoader.loadMeshCb = (path, _manager, done) => {
  const file = path.split('/').pop()!
  if (!urlByFile[file]) {
    done(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), fillMat))
    return
  }
  pending.push(
    loadGeom(file)
      .then((g) => {
        const m = new THREE.Mesh(g, fillMat)
        m.userData.file = file
        done(m)
        loadingEl.textContent = `Loading parts… ${++loaded}`
      })
      .catch(() => done(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), fillMat))),
  )
}

const assembly = new THREE.Group()
scene.add(assembly)
const parts: Part[] = []
let size = 1
const center = new THREE.Vector3()
let grid: THREE.GridHelper | null = null

urdfLoader.load(urdfUrl, async (robot) => {
  robot.rotation.x = -Math.PI / 2 // URDF is Z-up
  scene.add(robot)
  await Promise.all(pending)
  robot.updateMatrixWorld(true)

  // Collect meshes with their owning URDF link, then flatten into one group (world transforms kept).
  const meshes: { mesh: THREE.Mesh; link: string }[] = []
  robot.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.userData.file) return
    let p: THREE.Object3D | null = m.parent
    while (p && !(p as unknown as { isURDFLink?: boolean }).isURDFLink) p = p.parent
    meshes.push({ mesh: m, link: p?.name ?? 'root' })
  })
  for (const { mesh } of meshes) assembly.attach(mesh)
  scene.remove(robot)

  const all = new THREE.Box3().setFromObject(assembly)
  const robotC = all.getCenter(new THREE.Vector3())
  size = all.getSize(new THREE.Vector3()).length()

  // Per-link centers.
  const linkC = new Map<string, THREE.Vector3>()
  const linkN = new Map<string, number>()
  const boxes = meshes.map(({ mesh }) => new THREE.Box3().setFromObject(mesh))
  meshes.forEach(({ link }, i) => {
    const c = boxes[i].getCenter(new THREE.Vector3())
    linkC.set(link, (linkC.get(link) ?? new THREE.Vector3()).add(c))
    linkN.set(link, (linkN.get(link) ?? 0) + 1)
  })
  for (const [l, v] of linkC) v.divideScalar(linkN.get(l)!)

  // Hierarchical explode: links move away from the rover center, parts away from their link center,
  // chassis lifts. Vertical spread is damped so the figure reads as an exploded drawing.
  const perGroup = new Map<Key, number>()
  meshes.forEach(({ mesh, link }, i) => {
    const file = mesh.userData.file as string
    const k = groupOf(file)
    const c0 = boxes[i].getCenter(new THREE.Vector3())
    const lc = linkC.get(link)!
    const linkDir = lc.clone().sub(robotC).multiply(new THREE.Vector3(1.1, 0.4, 1.1))
    const partDir = c0.clone().sub(lc).multiplyScalar(0.75)
    const off = linkDir.add(partDir)
    if (link === 'chassis_assembly') off.y += size * 0.22
    if (k === 'wheels') off.multiplyScalar(1.25)

    const n = perGroup.get(k) ?? 0
    perGroup.set(k, n + 1)
    const D = 0.35
    const delay = Math.min(D, (ORDER.indexOf(k) / (ORDER.length - 1)) * D * 0.9 + (n % 6) * 0.008)

    if (!edgeCache.has(file)) edgeCache.set(file, new THREE.EdgesGeometry(mesh.geometry, 28))
    mesh.add(new THREE.LineSegments(edgeCache.get(file)!, lineMats[k]))

    parts.push({ mesh, key: k, base: mesh.position.clone(), c0, off, box: boxes[i], delay, e: 0 })
  })

  buildCallouts(perGroup)
  document.getElementById('meta')!.textContent =
    `${parts.length} parts · ${linkN.size} links · ${perGroup.get('motors') ?? 0} drive parts · 6 wheels`
  loadingEl.remove()
  fit()
  new ResizeObserver(fit).observe(stage)
  if (!reduced) setTimeout(() => go(1), 700)
})

/* ---------- Framing: fit both assembled and exploded states ---------- */
const spread = () => Number(spreadRange.value) / 100

function fit() {
  const w = stage.clientWidth
  const h = stage.clientHeight
  renderer.setSize(w, h)
  const s = spread()

  const union = new THREE.Box3()
  const tmp = new THREE.Box3()
  for (const p of parts) {
    union.union(p.box)
    union.union(tmp.copy(p.box).translate(p.off.clone().multiplyScalar(s)))
  }
  union.getCenter(center)

  camera.position.copy(center).addScaledVector(VIEW_DIR, size * 3)
  camera.zoom = 1
  camera.lookAt(center)
  camera.updateMatrixWorld()
  controls.target.copy(center)

  const inv = camera.matrixWorldInverse
  const cv = center.clone().applyMatrix4(inv)
  const v = new THREE.Vector3()
  let hx = 0
  let hy = 0
  for (const p of parts) {
    for (const k of [0, 1]) {
      const shift = p.off.clone().multiplyScalar(s * k)
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? p.box.max.x : p.box.min.x, i & 2 ? p.box.max.y : p.box.min.y, i & 4 ? p.box.max.z : p.box.min.z)
        v.add(shift).applyMatrix4(inv).sub(cv)
        hx = Math.max(hx, Math.abs(v.x))
        hy = Math.max(hy, Math.abs(v.y))
      }
    }
  }
  const gutter = w > 760 ? 250 : 12
  const aspect = w / h
  const half = Math.max(hy / 0.84, hx / (aspect * ((w - 2 * gutter) / w)))
  camera.left = -half * aspect
  camera.right = half * aspect
  camera.top = half
  camera.bottom = -half
  camera.updateProjectionMatrix()
  controls.update()

  if (grid) scene.remove(grid)
  grid = new THREE.GridHelper(size * 4, 48, 0x1c2430, 0x131920)
  grid.position.set(center.x, union.min.y - size * 0.01, center.z)
  scene.add(grid)
}

/* ---------- Explode / assemble ---------- */
let T = 0
let from = 0
let to = 0
let t0 = 0
let dur = 0
const D = 0.35
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function go(target: number) {
  from = T
  to = target
  t0 = performance.now()
  dur = reduced ? 0 : 2000 * Math.abs(target - T) // interruptible: always starts from the current state
  toggle.textContent = target > 0.5 ? 'Assemble' : 'Disassemble'
}
toggle.onclick = () => go(to > 0.5 ? 0 : 1)
tRange.oninput = () => {
  T = to = from = Number(tRange.value) / 100
  dur = 0
  toggle.textContent = T > 0.5 ? 'Assemble' : 'Disassemble'
}
spreadRange.oninput = fit

function applyPositions() {
  const s = spread()
  for (const p of parts) {
    p.e = ease(clamp01((T - p.delay) / (1 - D)))
    p.mesh.position.copy(p.base).addScaledVector(p.off, s * p.e)
  }
}

/* ---------- Callouts (projected each frame, stacked per side) ---------- */
const SVGNS = 'http://www.w3.org/2000/svg'
const callouts = new Map<Key, { el: HTMLDivElement; g: SVGGElement; line: SVGPolylineElement; dot: SVGCircleElement }>()

function buildCallouts(counts: Map<Key, number>) {
  const legend = document.getElementById('legend')!
  for (const k of ORDER) {
    const n = counts.get(k)
    if (!n) continue
    const el = document.createElement('div')
    el.className = 'callout'
    el.innerHTML = `<div class="t">${INFO[k].title}</div><div class="d">${INFO[k].detail(n)}</div>`
    calloutsEl.appendChild(el)
    const g = document.createElementNS(SVGNS, 'g')
    const line = document.createElementNS(SVGNS, 'polyline')
    const dot = document.createElementNS(SVGNS, 'circle')
    dot.setAttribute('r', '3')
    g.append(line, dot)
    leads.appendChild(g)
    callouts.set(k, { el, g, line, dot })
    const li = document.createElement('li')
    li.innerHTML = `<span>${INFO[k].title}</span><span>${INFO[k].detail(n)}</span>`
    legend.appendChild(li)
  }
}

function updateCallouts() {
  const vis = smooth(0.6, 0.95, T)
  calloutsEl.style.opacity = leads.style.opacity = String(vis)
  if (vis === 0) return
  const w = stage.clientWidth
  const h = stage.clientHeight
  const gutter = 250
  const s = spread()
  const v = new THREE.Vector3()

  const items: { k: Key; x: number; y: number }[] = []
  for (const k of callouts.keys()) {
    const acc = new THREE.Vector3()
    let n = 0
    for (const p of parts) {
      if (p.key !== k) continue
      acc.add(v.copy(p.c0).addScaledVector(p.off, s * p.e))
      n++
    }
    acc.divideScalar(n).project(camera)
    items.push({ k, x: ((acc.x + 1) / 2) * w, y: ((1 - acc.y) / 2) * h })
  }

  for (const side of ['L', 'R'] as const) {
    const list = items.filter((i) => (i.x < w / 2) === (side === 'L')).sort((a, b) => a.y - b.y)
    const GAP = 58
    const ys = list.map((i) => i.y)
    for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + GAP : 44)
    for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i < ys.length - 1 ? ys[i + 1] - GAP : h - 44)
    list.forEach((it, i) => {
      const c = callouts.get(it.k)!
      const y = ys[i]
      const endX = side === 'L' ? gutter - 14 : w - gutter + 14
      const elbowX = side === 'L' ? gutter + 14 : w - gutter - 14
      c.el.className = `callout ${side === 'L' ? 'left' : 'right'}${hovered === it.k ? ' hot' : ''}`
      c.el.style.left = `${side === 'L' ? endX - 218 : endX + 8}px`
      c.el.style.top = `${y}px`
      c.line.setAttribute('points', `${it.x},${it.y} ${elbowX},${y} ${endX},${y}`)
      c.dot.setAttribute('cx', String(it.x))
      c.dot.setAttribute('cy', String(it.y))
      c.g.setAttribute('class', hovered === it.k ? 'hot' : '')
    })
  }
}

/* ---------- Hover: highlight a part group ---------- */
const ray = new THREE.Raycaster()
const ndc = new THREE.Vector2()
let pointerDirty = false
let pointerIn = false
let hovered: Key | null = null
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect()
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  pointerDirty = pointerIn = true
})
renderer.domElement.addEventListener('pointerleave', () => {
  pointerIn = false
  pointerDirty = true
})

function updateHover() {
  if (!pointerDirty) return
  pointerDirty = false
  let next: Key | null = null
  if (pointerIn) {
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(parts.map((p) => p.mesh), false)[0]
    if (hit) next = parts.find((p) => p.mesh === hit.object)?.key ?? null
  }
  if (next === hovered) return
  hovered = next
  for (const k of ORDER) lineMats[k].color.copy(k === hovered ? ACCENT : LINE)
}

/* ---------- Loop ---------- */
renderer.setAnimationLoop(() => {
  if (T !== to) {
    const k = dur ? Math.min(1, (performance.now() - t0) / dur) : 1
    T = from + (to - from) * k
    tRange.value = String(Math.round(T * 100))
  }
  applyPositions()
  controls.update()
  updateHover()
  renderer.render(scene, camera)
  updateCallouts()
})
