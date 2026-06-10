import { useEffect, useState, lazy, Suspense } from 'react'

const URDFViewer = lazy(() => import('../components/URDFViewer'))

type RoverStep = {
  kicker: string
  title: string
  summary: string
  points: string[]
}

type RoverShowcaseData = {
  title: string
  subtitle: string
  steps: RoverStep[]
}

export default function RoverShowcase() {
  const [showcase, setShowcase] = useState<RoverShowcaseData | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}lib/rover-showcase.json`)
      .then((r) => r.json())
      .then((data: RoverShowcaseData) => setShowcase(data))
      .catch(() => setShowcase(null))
  }, [])

  if (!showcase) {
    return null
  }

  return (
    <section className="rover-showcase">
      <h2 className="section-title">{showcase.title}</h2>
      <p className="rover-subtitle">{showcase.subtitle}</p>

      <Suspense fallback={<div className="urdf-viewer"><div className="urdf-viewer-canvas" /><div className="urdf-viewer-overlay">Loading rover model…</div></div>}>
        <URDFViewer />
      </Suspense>

      <ol className="rover-timeline">
        {showcase.steps.map((step, index) => (
          <li key={step.title} className="rover-step">
            <div className="rover-step-marker" aria-hidden="true">
              <span className="rover-step-number">{String(index + 1).padStart(2, '0')}</span>
              {index < showcase.steps.length - 1 && <span className="rover-step-path" />}
            </div>

            <article className="rover-step-card">
              <div className="rover-step-kicker">{step.kicker}</div>
              <h3 className="rover-step-title">{step.title}</h3>
              <p className="rover-step-summary">{step.summary}</p>
              <ul className="rover-step-points">
                {step.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}