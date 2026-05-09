import { useRef, useState, useEffect } from 'react'

export default function Card3D({ cardImageName = 'lucario' }: { cardImageName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // only track y rotation now
  const [rotationY, setRotationY] = useState(0)

  // continuous slow rotation using time delta for consistent speed
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const speedDegPerSec = 10 // degrees per second (slow)

    const loop = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      setRotationY((r) => (r + speedDegPerSec * dt) % 360)
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="card-3d-wrapper">
      <div
        ref={containerRef}
        className="card-3d-container no-pointer"
        // apply only Y rotation, keep X flat
        style={{ transform: `rotateX(0deg) rotateY(${-rotationY}deg)`, transition: 'transform 120ms linear' }}
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
