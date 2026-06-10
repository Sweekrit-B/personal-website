import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import robotUrdfUrl from '../assets/robot.urdf?url'

// Eagerly resolve all STL asset URLs at build time
const stlModules = import.meta.glob('../assets/rover_assets/*.stl', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

const stlMap: Record<string, string> = {}
for (const [modulePath, url] of Object.entries(stlModules)) {
  const filename = modulePath.split('/').pop()!
  stlMap[filename] = url
}

export default function URDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.001,
      100,
    )
    camera.position.set(2, 1.5, 2)

    // Lighting
    scene.add(new THREE.AmbientLight(0x8899cc, 0.9))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
    keyLight.position.set(3, 6, 2)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.near = 0.1
    keyLight.shadow.camera.far = 20
    keyLight.shadow.camera.left = -2
    keyLight.shadow.camera.right = 2
    keyLight.shadow.camera.top = 2
    keyLight.shadow.camera.bottom = -2
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4)
    fillLight.position.set(-3, 1, -2)
    scene.add(fillLight)

    // Ground grid
    const grid = new THREE.GridHelper(5, 30, 0x1e2d45, 0x162030)
    scene.add(grid)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 0.4
    controls.maxDistance = 8
    controls.maxPolarAngle = Math.PI * 0.85

    // LoadingManager fires onLoad only after every STL fetch completes
    const meshManager = new THREE.LoadingManager()

    let robotRef: THREE.Object3D | null = null
    meshManager.onLoad = () => {
      if (!robotRef) return
      const box = new THREE.Box3().setFromObject(robotRef)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      camera.position.set(
        center.x + maxDim * 2.2,
        center.y + maxDim * 1.0,
        center.z + maxDim * 2.2,
      )
      camera.lookAt(center)
      controls.target.copy(center)
      controls.update()

      grid.position.y = box.min.y - 0.005
      setLoading(false)
    }

    // URDF loading
    const urdfLoader = new URDFLoader(meshManager)
    urdfLoader.packages = { assets: '' }
    urdfLoader.loadMeshCb = (path, manager, done) => {
      const filename = path.split('/').pop()!
      const url = stlMap[filename]
      if (url) {
        new STLLoader(manager).load(
          url,
          (geometry) => {
            geometry.computeVertexNormals()
            const mesh = new THREE.Mesh(
              geometry,
              new THREE.MeshPhongMaterial({ shininess: 40 }),
            )
            mesh.castShadow = true
            mesh.receiveShadow = true
            done(mesh)
          },
          undefined,
          () => done(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshPhongMaterial())),
        )
      } else {
        done(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshPhongMaterial()))
      }
    }

    urdfLoader.load(
      robotUrdfUrl,
      (robot) => {
        // URDF is Z-up; rotate to Three.js Y-up
        robot.rotation.x = -Math.PI / 2
        robot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true
            obj.receiveShadow = true
          }
        })
        robotRef = robot
        scene.add(robot)
      },
      undefined,
      (err) => {
        console.error('URDF load error:', err)
        setError('Failed to load robot model')
        setLoading(false)
      },
    )

    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="urdf-viewer">
      <div ref={containerRef} className="urdf-viewer-canvas" />
      {(loading || error) && (
        <div className="urdf-viewer-overlay">
          {error ? error : 'Loading rover model…'}
        </div>
      )}
      <p className="urdf-viewer-hint">Drag to orbit · Scroll to zoom · Right-drag to pan</p>
    </div>
  )
}
