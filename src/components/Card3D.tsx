import { useRef, useState, useEffect } from 'react'

export default function Card3D({ cardImageName = 'lucario' }: { cardImageName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotY, setRotY] = useState(0)
  const [dragging, setDragging] = useState(false)

  // All mutable animation state lives in a ref so the RAF closure always has fresh values.
  const s = useRef({
    rotY: 0,
    active: false,
    startX: 0,
    startRotY: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,   // deg / ms  (negative = spinning left, positive = right)
  })

  useEffect(() => {
    let raf = 0
    let lastT = performance.now()

    const AUTO_SPD  = 10      // deg / sec during idle auto-rotate
    const SENS      = 0.38    // deg per pixel dragged
    const DAMPING   = 0.0035  // friction per ms (frame-rate independent)
    const MIN_VEL   = 0.002   // deg/ms — below this, snap to auto-rotate

    const tick = (t: number) => {
      const dt = Math.min(t - lastT, 50)   // clamp to avoid large jumps on tab restore
      lastT = t

      if (!s.current.active) {
        const v = s.current.velocity
        if (Math.abs(v) > MIN_VEL) {
          // momentum: decelerate and spin
          s.current.velocity = v * Math.max(0, 1 - DAMPING * dt)
          s.current.rotY = (s.current.rotY + v * dt) % 360
        } else {
          // auto-rotate
          s.current.velocity = 0
          s.current.rotY = (s.current.rotY + AUTO_SPD * dt / 1000) % 360
        }
        setRotY(s.current.rotY)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // ── pointer helpers ──────────────────────────────────────
    const dragStart = (clientX: number, timeStamp: number) => {
      s.current.active   = true
      s.current.startX   = clientX
      s.current.startRotY = s.current.rotY
      s.current.lastX    = clientX
      s.current.lastTime = timeStamp
      s.current.velocity = 0
      setDragging(true)
    }

    const dragMove = (clientX: number, timeStamp: number) => {
      if (!s.current.active) return
      const dx = clientX - s.current.lastX
      const dt = timeStamp - s.current.lastTime
      // velocity sign: dragging right (dx>0) should decrease rotY (card spins right)
      if (dt > 0) s.current.velocity = -(dx * SENS) / dt
      s.current.lastX    = clientX
      s.current.lastTime = timeStamp
      const newRotY = s.current.startRotY - (clientX - s.current.startX) * SENS
      s.current.rotY = newRotY
      setRotY(newRotY)
    }

    const dragEnd = () => {
      s.current.active = false
      setDragging(false)
    }

    // ── event listeners ──────────────────────────────────────
    const onMouseDown  = (e: MouseEvent)  => dragStart(e.clientX, e.timeStamp)
    const onMouseMove  = (e: MouseEvent)  => dragMove(e.clientX, e.timeStamp)
    const onTouchStart = (e: TouchEvent)  => dragStart(e.touches[0].clientX, e.timeStamp)
    const onTouchMove  = (e: TouchEvent)  => { e.preventDefault(); dragMove(e.touches[0].clientX, e.timeStamp) }

    const el = containerRef.current
    el?.addEventListener('mousedown',  onMouseDown)
    el?.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   dragEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend',  dragEnd)

    return () => {
      cancelAnimationFrame(raf)
      el?.removeEventListener('mousedown',  onMouseDown)
      el?.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   dragEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend',  dragEnd)
    }
  }, [])

  return (
    <div className="card-3d-wrapper">
      <div
        ref={containerRef}
        className="card-3d-container"
        style={{
          transform: `rotateY(${-rotY}deg)`,
          transition: 'none',          // RAF provides smooth updates; CSS transition adds lag
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        aria-hidden
      >
        <div className="card-3d-content">
          <div className="card-face card-front">
            <img
              src={`${import.meta.env.BASE_URL}card-images/${cardImageName}.png`}
              alt={`${cardImageName} card front`}
              className="card-front-img"
            />
          </div>
          <div className="card-face card-back">
            <img
              src={`${import.meta.env.BASE_URL}card-images/back.png`}
              alt="Card back"
              className="card-back-img"
            />
          </div>
          <div className="card-side card-left" />
          <div className="card-side card-right" />
        </div>
      </div>
    </div>
  )
}
