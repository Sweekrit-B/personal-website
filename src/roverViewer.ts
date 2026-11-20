// Demo only: assembled rover URDF in line-art style, mounted inside the Mars Rover card.
// Exposes window.mountRover(el) for index.html's inline script.
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import urdfUrl from './assets/robot.urdf?url'
import { FRONT_PATHS, bfsRoute } from './roverTabs' // also registers window.renderRoverTabs


declare global {
  interface Window {
    mountRover?: (el: RoverHost) => void
  }
}
type RoverHost = HTMLElement & { _dispose?: () => void; _overlay?: (id: string | null) => void }

const stlUrls = import.meta.glob('./assets/rover_assets/*.stl', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>
const urlByFile: Record<string, string> = {}
for (const [p, u] of Object.entries(stlUrls)) urlByFile[p.split('/').pop()!] = u

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
// Shared across mounts so reopening the card doesn't refetch or re-parse.
const geomCache = new Map<string, Promise<THREE.BufferGeometry>>()
const edgeCache = new Map<string, THREE.EdgesGeometry>()
const stl = new STLLoader()
function loadGeom(file: string) {
  if (!geomCache.has(file)) {
    geomCache.set(file, stl.loadAsync(urlByFile[file]).then((g) => (g.computeVertexNormals(), g)))
  }
  return geomCache.get(file)!
}

/* ---------- Mars terrain ---------- */
// Small seeded value noise: deterministic, so the landscape is the same on every visit.
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x: number, y: number) {
  let sum = 0, amp = 0.5, f = 1
  for (let o = 0; o < 4; o++) { sum += amp * noise(x * f, y * f); f *= 2.1; amp *= 0.5 }
  return sum
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Ground and rocks around a rover whose bounds are `box` (Y-up). Returns the group to add.
function buildMars(box: THREE.Box3) {
  const group = new THREE.Group()
  const center = box.getCenter(new THREE.Vector3())
  const dims = box.getSize(new THREE.Vector3())
  const size = dims.length()
  const floor = box.min.y
  // The rover's long horizontal axis is its driving direction (+along is forward); ruts trail behind it.
  const alongX = dims.x >= dims.z
  const half = (alongX ? dims.z : dims.x) / 2
  const S = size
  const frame = (x: number, z: number) => {
    const dx = x - center.x, dz = z - center.z
    return { r: Math.hypot(dx, dz), along: alongX ? dx : dz, across: alongX ? dz : dx }
  }
  // Keep the ground ahead of the rover (where it drives the logged path) free of big features.
  const inCorridor = (along: number, across: number) => along > -S * 0.5 && along < S * 4.5 && Math.abs(across) < S * 2

  // Craters: seeded bowls with raised rims, never in the driving corridor.
  const craters: { x: number; z: number; R: number; depth: number }[] = []
  for (let i = 0; craters.length < 7 && i < 60; i++) {
    const a = hash(i, 13.1) * Math.PI * 2, d = S * (1.6 + 4.2 * hash(i, 17.7))
    const x = center.x + Math.cos(a) * d, z = center.z + Math.sin(a) * d
    const R = S * (0.3 + 0.75 * hash(i, 19.3) ** 1.5)
    const f = frame(x, z)
    if (inCorridor(f.along, f.across) || f.r - R < S * 1.1) continue
    craters.push({ x, z, R, depth: R * 0.32 })
  }
  // Mesas: flat-topped blocks with stepped sides, out toward the horizon.
  const mesas = [0.7, 3.9].map((a, i) => {
    const ang = a + hash(i, 23.1)
    return { x: center.x + Math.cos(ang) * S * 6.5, z: center.z + Math.sin(ang) * S * 6.5, R: S * (1.3 + 0.6 * i), H: S * (0.7 + 0.3 * i) }
  })

  const relief = (x: number, z: number) => {
    const { r } = frame(x, z)
    const far = smooth(S * 3, S * 8, r) // the middle stays flat; hills and ridges rise toward the horizon
    const dunes = (fbm(x / (S * 0.9) + 3.1, z / (S * 0.9) - 1.7) - 0.5) * S * 0.16
    const hills = (fbm(x / (S * 3.4) - 7.3, z / (S * 3.4) + 2.9) - 0.38) * S * 1.1 * far
    const fold = fbm(x / (S * 2.2) + 11.2, z / (S * 2.2) - 4.4)
    const ridges = Math.pow(1 - Math.abs(fold * 2 - 1), 3) * S * 0.55 * far // folded noise: sharp crests
    let crater = 0, bowl = 0
    for (const c of craters) {
      const q = Math.hypot(x - c.x, z - c.z) / c.R
      const b = Math.exp(-q * q * 2.4)
      bowl = Math.max(bowl, b)
      crater += -c.depth * b + c.depth * 0.5 * Math.exp(-(((q - 1) / 0.25) ** 2))
    }
    let mesa = 0
    for (const m of mesas) {
      const t = smooth(m.R, m.R * 0.7, Math.hypot(x - m.x, z - m.z))
      mesa = Math.max(mesa, m.H * (Math.floor(t * 3) / 3 * 0.6 + t * 0.4)) // terraced sides
    }
    return { h: dunes + hills + ridges + crater + mesa, bowl, far }
  }
  const heightAt = (x: number, z: number) => {
    const { r, along, across } = frame(x, z)
    const grit = (fbm(x / (S * 0.12), z / (S * 0.12)) - 0.5) * S * 0.012
    const pad = smooth(S * 0.45, S * 0.95, r) // flat where the rover stands
    let rut = 0 // two ruts behind the rover, one under each wheel line
    if (along < 0) for (const s of [-1, 1]) rut += Math.exp(-(((across - s * half * 0.85) / (S * 0.018)) ** 2))
    return (relief(x, z).h + grit) * pad - rut * S * 0.006 * smooth(-S * 2.2, -S * 0.3, along)
  }

  const extent = S * 18
  const seg = 200
  const ground = new THREE.PlaneGeometry(extent, extent, seg, seg)
  ground.rotateX(-Math.PI / 2)
  const pos = ground.attributes.position
  const colors = new Float32Array(pos.count * 3)
  // Colour: basalt-dark crater floors, rust on the plains, pale dust on high and sun-facing ground.
  const basalt = new THREE.Color(0x3d1e12), low = new THREE.Color(0x5a2a17), mid = new THREE.Color(0x8c4a2a), high = new THREE.Color(0xb7774c), dust = new THREE.Color(0xc9936a), c = new THREE.Color()
  const step = extent / seg
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + center.x, z = pos.getZ(i) + center.z
    const h = heightAt(x, z)
    pos.setXYZ(i, x, floor + h, z)
    const { bowl } = relief(x, z)
    const slope = Math.abs(heightAt(x + step, z) - h) + Math.abs(heightAt(x, z + step) - h)
    const t = Math.min(1, Math.max(0, h / (S * 0.9) + 0.45 + (fbm(x / (S * 0.05), z / (S * 0.05)) - 0.5) * 0.35))
    c.copy(low).lerp(mid, Math.min(1, t * 1.5)).lerp(high, Math.max(0, t - 0.55) * 1.6)
    c.lerp(basalt, Math.min(0.75, bowl * 0.9 + Math.min(1, slope / (S * 0.18)) * 0.35)) // steep and sunken ground is darker
    const patch = smooth(0.58, 0.72, fbm(x / (S * 1.6) + 40, z / (S * 1.6) - 9))
    c.lerp(dust, patch * 0.35) // drifts of lighter dust
    colors.set([c.r, c.g, c.b], i * 3)
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  ground.computeVertexNormals()
  const groundMesh = new THREE.Mesh(ground, new THREE.MeshLambertMaterial({ vertexColors: true }))
  groundMesh.receiveShadow = true
  group.add(groundMesh)

  // Rocks: one lumpy icosahedron, instanced with seeded positions, sizes and turns.
  const rock = new THREE.IcosahedronGeometry(1, 1)
  const rp = rock.attributes.position
  for (let i = 0; i < rp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(rp, i)
    v.multiplyScalar(0.75 + 0.45 * hash(v.x * 3.3 + 1, v.y * 2.7 + v.z * 5.1))
    rp.setXYZ(i, v.x, v.y, v.z)
  }
  rock.computeVertexNormals()
  const SCATTER = 70, RIM = 6 // loose rocks, plus boulders around each crater rim
  const COUNT = SCATTER + RIM * craters.length
  const rocks = new THREE.InstancedMesh(rock, new THREE.MeshLambertMaterial({ color: 0x4a2618, flatShading: true }), COUNT)
  rocks.castShadow = true
  rocks.receiveShadow = true
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    const angle = hash(i, 1.3) * Math.PI * 2
    const big = hash(i, 4.2) > 0.88
    let k = size * (big ? 0.07 + 0.06 * hash(i, 2.2) : 0.012 + 0.035 * hash(i, 5.5))
    if (i < SCATTER) {
      const r = size * (0.62 + 2.2 * hash(i, 7.9) ** 1.4)
      p.set(center.x + Math.cos(angle) * r, 0, center.z + Math.sin(angle) * r)
    } else {
      const cr = craters[(i - SCATTER) % craters.length]
      const r = cr.R * (0.95 + 0.35 * hash(i, 7.9))
      k = size * (0.04 + 0.08 * hash(i, 2.2))
      p.set(cr.x + Math.cos(angle) * r, 0, cr.z + Math.sin(angle) * r)
    }
    p.y = floor + heightAt(p.x, p.z) + k * 0.35
    s.set(k * (0.8 + 0.5 * hash(i, 9.1)), k * (0.5 + 0.4 * hash(i, 3.3)), k * (0.8 + 0.5 * hash(i, 6.6)))
    q.setFromEuler(e.set(hash(i, 8.8) * 0.6, hash(i, 1.1) * Math.PI * 2, hash(i, 2.9) * 0.6))
    rocks.setMatrixAt(i, m.compose(p, q, s))
  }
  group.add(rocks)
  group.userData.heightAt = heightAt
  return group
}

/* ---------- Dev workflow: the same ground as a Webots-style sim world ---------- */
function buildSim(mars: THREE.Group) {
  const group = new THREE.Group()
  const ground = (mars.children[0] as THREE.Mesh).geometry as THREE.BufferGeometry
  const rocks = mars.children[1] as THREE.InstancedMesh
  // Dark floor that still takes the rover's shadow, with grid lines draped on the same heights.
  const floor = new THREE.Mesh(ground, new THREE.MeshLambertMaterial({ color: 0x151b24, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }))
  floor.receiveShadow = true
  const pos = ground.attributes.position
  const n = Math.round(Math.sqrt(pos.count)) // vertices per row of the square plane
  const idx: number[] = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const i = r * n + c
      if (r % 2 === 0 && c < n - 1) idx.push(i, i + 1)
      if (c % 2 === 0 && r < n - 1) idx.push(i, i + n)
    }
  const grid = new THREE.BufferGeometry()
  grid.setAttribute('position', pos)
  grid.setIndex(idx)
  const lines = new THREE.LineSegments(grid, new THREE.LineBasicMaterial({ color: 0x4f8fe0, transparent: true, opacity: 0.4 }))
  const wire = new THREE.InstancedMesh(rocks.geometry, new THREE.MeshBasicMaterial({ color: 0x8fb4ef, wireframe: true }), rocks.count)
  wire.instanceMatrix.copy(rocks.instanceMatrix)
  group.add(floor, lines, wire)
  return group
}

/* ---------- Navigation overlay: the logged Theta* waypoints laid on the terrain ---------- */
type NavOverlay = { group: THREE.Group; theta: THREE.Group; bfs: THREE.Group; thetaTubes: THREE.TubeGeometry[]; bfsTubes: THREE.TubeGeometry[] }
function buildNavOverlay(toWorld: (f: number, l: number, lift: number) => THREE.Vector3, size: number): NavOverlay {
  const group = new THREE.Group()
  // A ground-hugging ribbon through the waypoints, with a short post at each one.
  const route = (wps: [number, number][], color: number, radius: number, opacity: number, postEvery = 1) => {
    const g = new THREE.Group()
    const curve = new THREE.CurvePath<THREE.Vector3>()
    let prev = toWorld(wps[0][0], wps[0][1], size * 0.012)
    for (let i = 0; i < wps.length - 1; i++) {
      for (let s = 1; s <= 12; s++) {
        const t = s / 12
        const p = toWorld(wps[i][0] + (wps[i + 1][0] - wps[i][0]) * t, wps[i][1] + (wps[i + 1][1] - wps[i][1]) * t, size * 0.012)
        curve.add(new THREE.LineCurve3(prev, p))
        prev = p
      }
    }
    const tube = new THREE.TubeGeometry(curve, Math.max(160, wps.length * 16), size * radius, 6, false)
    g.add(new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })))
    const postGeo = new THREE.CylinderGeometry(size * 0.01, size * 0.01, size * 0.05, 8)
    const postMat = new THREE.MeshBasicMaterial({ color })
    wps.forEach(([f, l], i) => {
      if (i % postEvery) return
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.copy(toWorld(f, l, 0)).add(new THREE.Vector3(0, size * 0.025, 0))
      g.add(post)
    })
    return { g, tube }
  }
  // After: the two logged Theta* replans. Before: BFS on the same grid, every cell a waypoint.
  const theta = new THREE.Group()
  const a = route(FRONT_PATHS[0], 0x4f8fe0, 0.009, 1)
  const b = route(FRONT_PATHS[1], 0x8fb4ef, 0.006, 0.7)
  theta.add(a.g, b.g)
  const bfs = new THREE.Group()
  const c = route(bfsRoute(), 0xe8774a, 0.008, 1)
  bfs.add(c.g)
  group.add(theta, bfs)
  // The obstacle both planners steer around (position illustrative, matching the 2D figure).
  const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 0.22, 1), new THREE.MeshLambertMaterial({ color: 0x4a2618, flatShading: true }))
  boulder.position.copy(toWorld(2.5, 0, size * 0.08))
  boulder.scale.set(1.3, 0.75, 1)
  boulder.castShadow = true
  group.add(boulder)
  return { group, theta, bfs, thetaTubes: [a.tube, b.tube], bfsTubes: [c.tube] }
}

/* ---------- Localization overlay: base station, 10 Hz correction pulses, shrinking fix ring ---------- */
/* ---------- Localization overlay: RTK. Satellites reach both the rover and a base station at a surveyed spot;
   the base works out the error and streams RTCM corrections to the rover. ---------- */
type SatLink = { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; delay: number; toRover: boolean }
type GnssOverlay = {
  group: THREE.Group; mast: THREE.Group; sats: THREE.Group; links: SatLink[]
  pulses: THREE.Mesh[]; ring: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3 // blue: base to rover
  satRing: THREE.Mesh; home: THREE.Vector3; jump: THREE.Vector3 // orange: the rover's raw GPS fix
  blueJump: THREE.Vector3; unit: number // the corrected fix's small residual error; ring sizes scale with unit
  orangeAt: THREE.Vector3; blueAt: THREE.Vector3; groundY: (x: number, z: number) => number // ring centres; ground height for draping
}
// Fix rings drape over the terrain: every vertex takes the ground height under it, so dips and bumps never hide them.
const RING_SEG = 96
function ringMesh(inner: number, color: number) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RING_SEG + 1) * 2 * 3), 3))
  const idx: number[] = []
  for (let i = 0; i < RING_SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  geo.setIndex(idx)
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }))
  m.frustumCulled = false // vertices move every frame
  m.userData.inner = inner
  return m
}
function drape(m: THREE.Mesh, at: THREE.Vector3, r: number, groundY: (x: number, z: number) => number, lift: number) {
  const pos = m.geometry.attributes.position as THREE.BufferAttribute
  const inner = m.userData.inner as number
  for (let i = 0; i <= RING_SEG; i++) {
    const a = (i / RING_SEG) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a)
    for (let j = 0; j < 2; j++) {
      const k = j === 0 ? inner : 1
      const x = at.x + cx * r * k, z = at.z + cz * r * k
      pos.setXYZ(i * 2 + j, x, groundY(x, z) + lift, z)
    }
  }
  pos.needsUpdate = true
}
const SAT_EVERY = 0.7 // a satellite signal every 0.7 s (illustrative pace)
const SAT_FALL = 0.6 // seconds from satellite to ground
function buildGnssOverlay(base: THREE.Vector3, ground: THREE.Vector3, antenna: THREE.Vector3, size: number, groundY: (x: number, z: number) => number): GnssOverlay {
  const group = new THREE.Group()
  const metal = new THREE.MeshLambertMaterial({ color: 0x8b95a1 })
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a3038 })

  // Base station: a mast with a receiver dish and a blue transmitter tip.
  const mast = new THREE.Group()
  const H = size * 0.6
  const foot = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.04, size * 0.16), dark)
  foot.position.copy(base).add(new THREE.Vector3(0, size * 0.02, 0))
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.012, size * 0.016, H, 10), metal)
  pole.position.copy(base).add(new THREE.Vector3(0, H / 2, 0))
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.07, size * 0.02, size * 0.03, 20), metal)
  dish.position.copy(base).add(new THREE.Vector3(0, H, 0))
  const tip = new THREE.Mesh(new THREE.SphereGeometry(size * 0.018, 12, 8), new THREE.MeshBasicMaterial({ color: 0x4f8fe0 }))
  tip.position.copy(base).add(new THREE.Vector3(0, H + size * 0.03, 0))
  for (const m of [foot, pole, dish, tip]) { m.castShadow = true; mast.add(m) }
  group.add(mast)
  const baseRx = dish.position.clone().add(new THREE.Vector3(0, size * 0.02, 0))

  // One satellite stands for the constellation; its signal goes to the rover and to the base.
  const sats = new THREE.Group()
  const away = antenna.clone().sub(base).setY(0).normalize()
  const panelMat = new THREE.MeshLambertMaterial({ color: 0x1d3557 })
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xe8774a })
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xe8774a })
  const links: SatLink[] = []
  const mid = antenna.clone().lerp(baseRx, 0.5)
  ;[0.15].forEach((turn, i) => {
    const dir = away.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), turn)
    const pos = mid.clone().addScaledVector(dir, size * 0.35).add(new THREE.Vector3(0, size * (0.8 + 0.12 * i), 0))
    const sat = new THREE.Group()
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(size * 0.08, size * 0.08, size * 0.1), metal))
    const wing = new THREE.Vector3(-dir.z, 0, dir.x)
    for (const sgn of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(size * 0.2, size * 0.008, size * 0.09), panelMat)
      panel.position.copy(wing).multiplyScalar(sgn * size * 0.15)
      panel.rotation.y = Math.atan2(-wing.z, wing.x)
      sat.add(panel)
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(size * 0.018, 12, 8), beaconMat)
    beacon.position.set(0, -size * 0.05, 0)
    sat.add(beacon)
    sat.position.copy(pos)
    sats.add(sat)
    const from = pos.clone().add(beacon.position)
    for (const [to, toRover] of [[antenna, true], [baseRx, false]] as const) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size * 0.014, 10, 8), pulseMat)
      group.add(mesh)
      links.push({ mesh, from, to, delay: i * SAT_EVERY, toRover })
    }
  })
  group.add(sats)

  // Blue corrections: six in flight at once, one leaving every 100 ms, each taking 600 ms.
  const corrMat = new THREE.MeshBasicMaterial({ color: 0x4f8fe0 })
  const pulses = Array.from({ length: 6 }, () => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.014, 10, 8), corrMat)
    group.add(p)
    return p
  })
  const ring = ringMesh(0.9, 0x6aa3ee)
  const satRing = ringMesh(0.95, 0xe8774a)
  group.add(ring, satRing)
  return {
    group, mast, sats, links, pulses, ring, from: tip.position.clone(), to: antenna, satRing,
    home: ground.clone(), jump: new THREE.Vector3(), blueJump: new THREE.Vector3(), unit: size * 1.2,
    orangeAt: ground.clone(), blueAt: ground.clone(), groundY,
  }
}

const HAZE = 0x4a2a1c // dusty Martian sky, also what the far ground fades into
function mountRover(el: RoverHost) {
  el._dispose?.()
  const status = document.createElement('div')
  status.className = 'rover-status'
  status.textContent = 'Loading rover model…'
  el.appendChild(status)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  el.prepend(renderer.domElement)

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  // Dusty sky from above, rust bounce from the ground, and a low warm sun.
  scene.add(new THREE.HemisphereLight(0xe0b48c, 0x3a1a0e, 1.5))
  const sun = new THREE.DirectionalLight(0xffd9b0, 1.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun, sun.target)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.enableZoom = false // don't trap page scroll inside the card
  controls.autoRotate = !reduced
  controls.autoRotateSpeed = 0.6
  controls.addEventListener('start', () => {
    controls.autoRotate = false
    status.hidden = true // the hint has done its job
  })

  const fill = new THREE.MeshLambertMaterial({ color: 0x2a3038, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
  const line = new THREE.LineBasicMaterial({ color: 0x8b95a1, transparent: true, opacity: 0.9 })
  const pending: Promise<unknown>[] = []
  const loader = new URDFLoader()
  loader.packages = { assets: '' }
  loader.loadMeshCb = (path, _m, done) => {
    const file = path.split('/').pop()!
    if (!urlByFile[file]) return done(new THREE.Object3D())
    pending.push(
      loadGeom(file)
        .then((g) => {
          if (!edgeCache.has(file)) edgeCache.set(file, new THREE.EdgesGeometry(g, 28))
          const m = new THREE.Mesh(g, fill)
          m.castShadow = true
          m.add(new THREE.LineSegments(edgeCache.get(file)!, line))
          done(m)
        })
        .catch(() => done(new THREE.Object3D())),
    )
  }

  let box: THREE.Box3 | null = null
  let roverBox: THREE.Box3 | null = null
  let nav: NavOverlay | null = null
  let navGrow = -1 // seconds since the path started drawing; -1 = idle
  let wantOverlay: string | null = null
  let makeNav: (() => NavOverlay) | null = null
  let gnss: GnssOverlay | null = null
  let gnssT = 0 // seconds since the Localization overlay opened
  let makeGnss: (() => GnssOverlay) | null = null
  let mars: THREE.Group | null = null
  // Drive rig: the rover sits in a pivot at its own centre, so it moves and turns as one piece.
  const pivot = new THREE.Group()
  type Drive = { pts: THREE.Vector3[]; cum: number[]; fwd: THREE.Vector3; halfLength: number; heightAt: (x: number, z: number) => number; baseH: number; wheels: string[]; wheelR: number; robot: { setJointValue: (n: string, v: number) => void } }
  let drive: Drive | null = null
  let driveT = -1 // seconds into the drive loop; -1 = parked
  let driveYaw = 0
  // Localization: the rover loops around the base station; its antenna position feeds the signals and fix rings.
  type Orbit = { antenna: THREE.Vector3; antennaL: THREE.Vector3; ground: THREE.Vector3; mx: number; mz: number; R: number; th0: number; sign: number }
  let orbit: Orbit | null = null
  let orbitT = -1
  function placeOrbit(dist: number, dt: number) {
    if (!orbit || !drive) return
    const o = orbit, d = drive
    const th = o.th0 + (o.sign * dist) / o.R
    const x = o.mx + Math.cos(th) * o.R, z = o.mz + Math.sin(th) * o.R
    const dir = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)).multiplyScalar(o.sign)
    const want = Math.atan2(-dir.z, dir.x) - Math.atan2(-d.fwd.z, d.fwd.x)
    const turn = Math.atan2(Math.sin(want - driveYaw), Math.cos(want - driveYaw)) // shortest way round
    driveYaw += dt > 0 ? turn * (1 - Math.exp(-dt * 4)) : turn
    pivot.position.set(x, d.heightAt(x, z) - d.baseH, z)
    pivot.rotation.y = driveYaw
    for (const w of d.wheels) d.robot.setJointValue(w, dist / d.wheelR)
    pivot.updateMatrixWorld(true)
    o.antenna.copy(o.antennaL).applyMatrix4(pivot.matrixWorld)
  }
  function placeRover(dist: number, dt: number) {
    if (!drive) return
    const d = drive
    let i = 1
    while (i < d.cum.length - 1 && d.cum[i] < dist) i++
    const a = d.pts[i - 1], b = d.pts[i]
    const front = a.clone().lerp(b, Math.min(1, Math.max(0, (dist - d.cum[i - 1]) / (d.cum[i] - d.cum[i - 1] || 1))))
    const dir = dist > 0 ? b.clone().sub(a).setY(0).normalize() : d.fwd.clone()
    const want = Math.atan2(-dir.z, dir.x) - Math.atan2(-d.fwd.z, d.fwd.x)
    driveYaw = dt > 0 ? driveYaw + (want - driveYaw) * (1 - Math.exp(-dt * 6)) : want // turn smoothly into each new heading
    const c = front.addScaledVector(dir, -d.halfLength)
    pivot.position.set(c.x, d.heightAt(c.x, c.z) - d.baseH, c.z)
    pivot.rotation.y = driveYaw
    for (const w of d.wheels) d.robot.setJointValue(w, dist / d.wheelR)
  }
  function parkRover() {
    driveT = -1
    orbitT = -1
    driveYaw = 0
    placeRover(0, 0)
  }
  let sim: THREE.Group | null = null
  const simTag = document.createElement('div')
  simTag.className = 'rover-sim'
  simTag.textContent = 'Simulation in Webots'
  simTag.hidden = true
  el.appendChild(simTag)
  // Tabs call this; 'nav' lays the logged path on the ground and widens the view to include it.
  el._overlay = (id) => {
    wantOverlay = id
    if (!makeNav || !makeGnss || !roverBox || !mars) return // applied once the rover has loaded
    for (const o of [nav, gnss]) if (o?.group.parent) scene.remove(o.group)
    // Dev workflow: swap Mars for the sim world.
    const simOn = id === 'dev'
    if (simOn && !sim) scene.add((sim = buildSim(mars)))
    if (sim) sim.visible = simOn
    mars.visible = !simOn
    // Mars gets a dusty haze; the sim world keeps a dark backdrop.
    if (scene.fog instanceof THREE.Fog) scene.fog.color.set(simOn ? 0x0b0e12 : HAZE)
    if (scene.background instanceof THREE.Color) scene.background.set(simOn ? 0x0b0e12 : HAZE)
    simTag.hidden = !simOn
    box = roverBox.clone()
    tight = id === 'gnss' ? 0.8 : 1.15
    parkRover()
    if (id === 'nav') {
      driveT = reduced ? -1 : 0
      nav ??= makeNav()
      scene.add(nav.group)
      navGrow = reduced ? 99 : 0
      box.union(new THREE.Box3().setFromObject(nav.group))
    } else if (id === 'gnss') {
      gnss ??= makeGnss()
      scene.add(gnss.group)
      gnssT = reduced ? 3 : 0
      orbitT = reduced ? -1 : 0
      box.union(new THREE.Box3().setFromObject(gnss.mast)).union(new THREE.Box3().setFromObject(gnss.sats))
      if (orbit && drive) {
        const e = orbit.R + drive.halfLength
        box.union(new THREE.Box3(new THREE.Vector3(orbit.mx - e, roverBox.min.y, orbit.mz - e), new THREE.Vector3(orbit.mx + e, roverBox.max.y, orbit.mz + e)))
      }
    }
    fit()
  }
  let tight = 1.15 // how much ground to show around the framed objects
  function fit() {
    const w = el.clientWidth
    const h = el.clientHeight
    renderer.setSize(w, h)
    if (!box) return
    const center = box.getCenter(new THREE.Vector3())
    const r = box.getSize(new THREE.Vector3()).length() / 2
    const aspect = w / h
    const half = Math.max(r * tight, (r * tight) / aspect) // wide enough to show the ground around it
    camera.left = -half * aspect
    camera.right = half * aspect
    camera.top = half
    camera.bottom = -half
    camera.updateProjectionMatrix()
    controls.target.copy(center)
    controls.update()
    // Haze starts past the framed area and is complete well beyond it, so a wider view never turns the field dark.
    if (scene.fog instanceof THREE.Fog) {
      const d = camera.position.distanceTo(controls.target)
      scene.fog.near = d + half * 0.9
      scene.fog.far = d + half * 4
    }
  }

  loader.load(
    urdfUrl,
    async (robot) => {
      robot.rotation.x = -Math.PI / 2 // URDF is Z-up
      await Promise.all(pending)
      scene.add(robot)
      robot.updateMatrixWorld(true)
      box = new THREE.Box3().setFromObject(robot)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3()).length()
      camera.position.copy(center).add(new THREE.Vector3(1, 1.05, 1.3).normalize().multiplyScalar(size * 3))
      camera.lookAt(center)
      mars = buildMars(box)
      scene.add(mars)
      // Rover frame for the overlay: forward points at the front wheel pair, lateral to its left.
      const heightAt = mars.userData.heightAt as (x: number, z: number) => number
      const links = (robot as unknown as { links?: Record<string, THREE.Object3D> }).links ?? {}
      const fwd = new THREE.Vector3()
      for (const n of ['wheel_assembly_3', 'wheel_assembly_6']) if (links[n]) fwd.add(links[n].getWorldPosition(new THREE.Vector3()).multiplyScalar(0.5))
      fwd.sub(center).setY(0)
      if (fwd.lengthSq() < 1e-8) fwd.set(1, 0, 0)
      fwd.normalize()
      const side = new THREE.Vector3(0, 1, 0).cross(fwd)
      const floorY = box.min.y
      const dims = box.getSize(new THREE.Vector3())
      const halfLength = (Math.abs(fwd.x) * dims.x + Math.abs(fwd.z) * dims.z) / 2
      const toWorld = (f: number, l: number, lift: number) => {
        const p = center.clone().addScaledVector(fwd, halfLength + f).addScaledVector(side, l)
        p.y = floorY + heightAt(p.x, p.z) + lift
        return p
      }
      makeNav = () => buildNavOverlay(toWorld, size)
      // The front-centre point follows the Theta* waypoints; sample them densely and measure along the way.
      const wp = FRONT_PATHS[0]
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < wp.length - 1; i++) for (let k = 0; k < 12; k++) pts.push(toWorld(wp[i][0] + (wp[i + 1][0] - wp[i][0]) * (k / 12), wp[i][1] + (wp[i + 1][1] - wp[i][1]) * (k / 12), 0))
      pts.push(toWorld(wp[wp.length - 1][0], wp[wp.length - 1][1], 0))
      const cum = [0]
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z))
      const joints = (robot as unknown as { joints?: Record<string, { jointType?: string }> }).joints ?? {}
      pivot.position.set(center.x, 0, center.z)
      scene.add(pivot)
      pivot.add(robot)
      robot.position.set(-center.x, 0, -center.z)
      drive = {
        pts, cum, fwd: fwd.clone(), halfLength, heightAt, baseH: heightAt(center.x, center.z),
        wheels: Object.keys(joints).filter((n) => joints[n].jointType === 'continuous'),
        wheelR: size * 0.05,
        robot: robot as unknown as Drive['robot'],
      }
      const ground = toWorld(-halfLength, 0, size * 0.008)
      const antenna = center.clone().setY(box.max.y + size * 0.04)
      const mastAt = toWorld(-halfLength - size * 0.2, size * 0.8, 0) // close by, so the loop around it stays in frame
      makeGnss = () => buildGnssOverlay(mastAt, ground, antenna, size, (x, z) => floorY + heightAt(x, z))
      const th0 = Math.atan2(center.z - mastAt.z, center.x - mastAt.x)
      orbit = {
        antenna, antennaL: antenna.clone().sub(new THREE.Vector3(center.x, 0, center.z)), ground: ground.clone(),
        mx: mastAt.x, mz: mastAt.z, R: Math.hypot(center.x - mastAt.x, center.z - mastAt.z), th0,
        sign: new THREE.Vector3(-Math.sin(th0), 0, Math.cos(th0)).dot(fwd) >= 0 ? 1 : -1, // start off heading roughly forward
      }
      roverBox = box.clone()
      // Haze fades the far terrain into the card's own background colour.
      scene.fog = new THREE.Fog(HAZE, size * 3.1, size * 5.6) // distances are reset in fit() to match the view
      scene.background = new THREE.Color(HAZE)
      sun.position.copy(center).add(new THREE.Vector3(-1.2, 1.1, 0.7).multiplyScalar(size * 2))
      sun.target.position.copy(center)
      const sc = sun.shadow.camera
      sc.left = sc.bottom = -size
      sc.right = sc.top = size
      sc.near = 0.01
      sc.far = size * 6
      sc.updateProjectionMatrix()
      fit()
      status.textContent = 'Drag to orbit'
      if (wantOverlay) el._overlay?.(wantOverlay)
    },
    undefined,
    () => (status.textContent = 'Could not load the rover model'),
  )

  const ro = new ResizeObserver(fit)
  ro.observe(el)
  let last = performance.now()
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    // The path draws itself in over 1.4 s when the Navigation tab opens.
    if (nav && navGrow >= 0) {
      navGrow += dt
      const k = Math.min(1, navGrow / 1.4)
      for (const t of [...nav.thetaTubes, ...nav.bfsTubes]) t.setDrawRange(0, Math.floor((t.index?.count ?? 0) * k / 6) * 6)
      if (k >= 1) navGrow = -1
    }
    // Localization (RTK). Satellite signals land at the rover and the base; each one at the rover gives a raw fix (orange ring, jumps).
    // Once the base has heard the satellites it streams corrections at 10 Hz (blue) and the corrected fix tightens onto the rover.
    if (gnss?.group.parent) {
      if (!reduced) gnssT += dt
      const g = gnss
      if (orbit && orbitT >= 0) {
        if (!reduced) orbitT += dt
        placeOrbit(orbitT * ((2 * Math.PI * orbit.R) / 20), dt) // one lap in 20 s
        g.home.copy(orbit.ground).add(new THREE.Vector3(pivot.position.x - orbit.ground.x, pivot.position.y, pivot.position.z - orbit.ground.z))
      }
      const sizeNow = g.from.distanceTo(g.to)
      for (const l of g.links) {
        const age = gnssT - l.delay
        const ph = (((age % SAT_EVERY) + SAT_EVERY) % SAT_EVERY) / SAT_FALL
        l.mesh.visible = age >= 0 && ph <= 1
        l.mesh.position.lerpVectors(l.from, l.to, Math.min(1, ph))
      }
      const fix = Math.floor((gnssT - SAT_FALL) / SAT_EVERY) // one raw fix per satellite signal
      if (fix >= 0) {
        const a = hash(fix, 2.7) * Math.PI * 2, d = g.unit * (0.12 + 0.18 * hash(fix, 5.3))
        g.jump.set(Math.cos(a) * d, 0, Math.sin(a) * d)
      }
      g.orangeAt.lerp(g.home.clone().add(g.jump), reduced ? 1 : 1 - Math.exp(-dt * 14))
      const rs = g.unit * 0.85 // raw GPS: much wider than the corrected fix
      drape(g.satRing, g.orangeAt, rs, g.groundY, g.unit * 0.012)
      const tc = gnssT - SAT_FALL
      g.pulses.forEach((p, i) => {
        const age = tc - i * 0.1
        p.visible = age >= 0
        const ph = (((age % 0.6) + 0.6) % 0.6) / 0.6
        p.position.lerpVectors(g.from, g.to, ph).add(new THREE.Vector3(0, Math.sin(Math.PI * ph) * sizeNow * 0.12, 0))
      })
      // Corrected fix: converges over 2.4 s, then keeps a small error that grows between corrections and is pulled back
      // in when each one arrives (10 Hz), with a slight wander re-picked at every correction.
      const k = Math.min(1, Math.max(0, tc) / 2.4)
      const cyc = (((tc % 0.1) + 0.1) % 0.1) / 0.1
      const settled = g.unit * (0.36 + 0.03 * cyc) // just wider than the rover, so the ring never hides under it
      const ease = 1 - Math.pow(1 - k, 3)
      const r = g.unit * 0.9 * (1 - ease) + settled * ease
      const ci = Math.floor(tc / 0.1)
      if (ci >= 0) {
        const a = hash(ci, 8.1) * Math.PI * 2, d = g.unit * (0.01 + 0.025 * hash(ci, 3.9))
        g.blueJump.set(Math.cos(a) * d, 0, Math.sin(a) * d)
      }
      g.blueAt.lerp(g.home.clone().add(g.blueJump), reduced ? 1 : 1 - Math.exp(-dt * 10))
      drape(g.ring, g.blueAt, r, g.groundY, g.unit * 0.016)
      g.ring.visible = tc >= 0
    }
    // Navigation: the rover drives the logged Theta* path, waits at the goal, and starts over.
    if (drive && driveT >= 0) {
      if (!reduced) driveT += dt
      const total = drive.cum[drive.cum.length - 1]
      const WAIT = 1.6, GO = 6, HOLD = 1.5
      if (driveT > WAIT + GO + HOLD) { driveT = 0; driveYaw = 0 }
      const u = Math.min(1, Math.max(0, (driveT - WAIT) / GO))
      placeRover(total * (u * u * (3 - 2 * u)), dt) // eased start and stop
    }
    controls.update()
    renderer.render(scene, camera)
  })

  el._dispose = () => {
    renderer.setAnimationLoop(null)
    ro.disconnect()
    controls.dispose()
    renderer.dispose()
    el.replaceChildren()
    el._dispose = undefined
  }
}

window.mountRover = mountRover
