// Demo only: assembled rover URDF in line-art style, mounted inside the Mars Rover card.
// Exposes window.mountRover(el) for demo.html's inline script.
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import urdfUrl from '../src/assets/robot.urdf?url'
import { FRONT_PATHS, bfsRoute } from './roverTabs' // also registers window.renderRoverTabs


declare global {
  interface Window {
    mountRover?: (el: RoverHost) => void
  }
}
type RoverHost = HTMLElement & { _dispose?: () => void; _overlay?: (id: string | null) => void }

const stlUrls = import.meta.glob('../src/assets/rover_assets/*.stl', {
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
  // The rover's long horizontal axis is its driving direction; ruts trail behind along it.
  const alongX = dims.x >= dims.z
  const half = (alongX ? dims.z : dims.x) / 2

  const heightAt = (x: number, z: number) => {
    const dx = x - center.x, dz = z - center.z
    const r = Math.hypot(dx, dz)
    const dunes = (fbm(x / (size * 0.9) + 3.1, z / (size * 0.9) - 1.7) - 0.5) * size * 0.16
    const grit = (fbm(x / (size * 0.12), z / (size * 0.12)) - 0.5) * size * 0.012
    const pad = smooth(size * 0.45, size * 0.95, r) // flat where the rover stands
    // Two ruts behind the rover, one under each wheel line.
    const along = alongX ? dx : dz, across = alongX ? dz : dx
    let rut = 0
    if (along < 0) for (const s of [-1, 1]) rut += Math.exp(-(((across - s * half * 0.85) / (size * 0.018)) ** 2))
    return (dunes + grit) * pad - rut * size * 0.006 * smooth(-size * 2.2, -size * 0.3, along)
  }

  const extent = size * 16
  const seg = 160
  const ground = new THREE.PlaneGeometry(extent, extent, seg, seg)
  ground.rotateX(-Math.PI / 2)
  const pos = ground.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const low = new THREE.Color(0x5a2a17), mid = new THREE.Color(0x8c4a2a), high = new THREE.Color(0xb7774c), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + center.x, z = pos.getZ(i) + center.z
    const h = heightAt(x, z)
    pos.setXYZ(i, x, floor + h, z)
    const t = Math.min(1, Math.max(0, h / (size * 0.08) + 0.5 + (fbm(x / (size * 0.05), z / (size * 0.05)) - 0.5) * 0.5))
    c.copy(low).lerp(mid, Math.min(1, t * 1.6)).lerp(high, Math.max(0, t - 0.6) * 1.5)
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
  const COUNT = 70
  const rocks = new THREE.InstancedMesh(rock, new THREE.MeshLambertMaterial({ color: 0x4a2618, flatShading: true }), COUNT)
  rocks.castShadow = true
  rocks.receiveShadow = true
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    const angle = hash(i, 1.3) * Math.PI * 2
    const r = size * (0.62 + 2.2 * hash(i, 7.9) ** 1.4)
    const big = hash(i, 4.2) > 0.88
    const k = size * (big ? 0.07 + 0.06 * hash(i, 2.2) : 0.012 + 0.035 * hash(i, 5.5))
    p.set(center.x + Math.cos(angle) * r, 0, center.z + Math.sin(angle) * r)
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
type GnssOverlay = { group: THREE.Group; mast: THREE.Group; pulses: THREE.Mesh[]; ring: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3 }
function buildGnssOverlay(base: THREE.Vector3, ground: THREE.Vector3, antenna: THREE.Vector3, size: number): GnssOverlay {
  const group = new THREE.Group()
  const mast = new THREE.Group()
  const metal = new THREE.MeshLambertMaterial({ color: 0x8b95a1 })
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a3038 })
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
  // Six pulses in flight at once: one leaves every 100 ms and each takes 600 ms to arrive.
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x4f8fe0 })
  const pulses = Array.from({ length: 6 }, () => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.014, 10, 8), pulseMat)
    group.add(p)
    return p
  })
  // Position-fix ring on the ground under the rover; it shrinks as corrections arrive.
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 72), new THREE.MeshBasicMaterial({ color: 0x4f8fe0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }))
  ring.rotation.x = -Math.PI / 2
  ring.position.copy(ground)
  group.add(ring)
  return { group, mast, pulses, ring, from: tip.position.clone(), to: antenna }
}

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
    simTag.hidden = !simOn
    box = roverBox.clone()
    if (id === 'nav') {
      nav ??= makeNav()
      scene.add(nav.group)
      navGrow = reduced ? 99 : 0
      box.union(new THREE.Box3().setFromObject(nav.group))
    } else if (id === 'gnss') {
      gnss ??= makeGnss()
      scene.add(gnss.group)
      gnssT = reduced ? 3 : 0
      box.union(new THREE.Box3().setFromObject(gnss.mast))
    }
    fit()
  }
  function fit() {
    const w = el.clientWidth
    const h = el.clientHeight
    renderer.setSize(w, h)
    if (!box) return
    const center = box.getCenter(new THREE.Vector3())
    const r = box.getSize(new THREE.Vector3()).length() / 2
    const aspect = w / h
    const half = Math.max(r * 1.15, (r * 1.15) / aspect) // wide enough to show the ground around it
    camera.left = -half * aspect
    camera.right = half * aspect
    camera.top = half
    camera.bottom = -half
    camera.updateProjectionMatrix()
    controls.target.copy(center)
    controls.update()
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
      camera.position.copy(center).add(new THREE.Vector3(1, 0.75, 1.3).normalize().multiplyScalar(size * 3))
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
      const ground = toWorld(-halfLength, 0, size * 0.008)
      const antenna = center.clone().setY(box.max.y + size * 0.04)
      makeGnss = () => buildGnssOverlay(toWorld(-halfLength - 1.4, 2.6, 0), ground, antenna, size)
      roverBox = box.clone()
      // Haze fades the far terrain into the card's own background colour.
      scene.fog = new THREE.Fog(0x0b0e12, size * 3.1, size * 5.6)
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
    // Localization: pulses stream from the base station at 10 Hz; the fix ring tightens over 2.4 s.
    if (gnss?.group.parent) {
      if (!reduced) gnssT += dt
      const sizeNow = gnss.from.distanceTo(gnss.to)
      gnss.pulses.forEach((p, i) => {
        const age = gnssT - i * 0.1
        p.visible = age >= 0
        const ph = (((age % 0.6) + 0.6) % 0.6) / 0.6
        p.position.lerpVectors(gnss!.from, gnss!.to, ph).add(new THREE.Vector3(0, Math.sin(Math.PI * ph) * sizeNow * 0.12, 0))
      })
      const k = Math.min(1, gnssT / 2.4)
      const e = 1 - Math.pow(1 - k, 3)
      const r = sizeNow * (0.55 - 0.47 * e)
      gnss.ring.scale.set(r, r, r)
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
