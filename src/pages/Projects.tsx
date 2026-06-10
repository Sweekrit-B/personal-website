import { useEffect, useState, lazy, Suspense } from 'react'
import GitHubCard from '../components/GitHubCard'
import ProjectStats from '../components/ProjectStats'

const URDFViewer = lazy(() => import('../components/URDFViewer'))

type RoverStep = {
  kicker: string
  title: string
  summary: string
}

type Project = {
  title: string
  year?: string
  video?: string
  description?: string
  skills?: string[]
  links?: { label: string; href: string }[]
  isRover?: boolean
  subtitle?: string
  steps?: RoverStep[]
}

export default function Projects() {
  const [items, setItems] = useState<Project[]>([])
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace('www.', '')
      if (host === 'youtu.be') {
        const id = parsed.pathname.slice(1)
        return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null
      }
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = parsed.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null
      }
    } catch {
      return null
    }
    return null
  }

  const getGitHubUrl = (p: Project) =>
    (p.links ?? []).find(l => l.href.includes('github.com'))?.href ?? null

  const getPaperUrl = (p: Project) =>
    (p.links ?? []).find(l => l.label === 'Paper')?.href ?? null

  const getDriveEmbedUrl = (url: string) => {
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null
  }

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}lib/project.json`)
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]))
  }, [])

  return (
    <section className="projects">
      <h2 className="section-title">Projects</h2>
      <ProjectStats items={items} />
      <ul className="list">
        {items.map((p, i) => (
          <li key={i} className="list-item">
            <button
              className={`item-button ${openIndex === i ? 'open' : ''}`}
              aria-expanded={openIndex === i}
              onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
            >
              <div className="item-left">
                <div className="item-title">{p.title}</div>
              </div>
              <div className="item-right">{p.year}</div>
            </button>

            {openIndex === i && (
              <div className="item-dropdown">
                {p.isRover ? (
                  <div className="item-dropdown-content rover-dropdown-content">
                    <div className="rover-dropdown-viewer">
                      <div className="video-wrap rover-video">
                        <iframe
                          src="https://www.youtube.com/embed/ofyGU1TOSJY?rel=0&modestbranding=1"
                          title="Mars Rover Team video"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                      <Suspense fallback={
                        <div className="urdf-viewer">
                          <div className="urdf-viewer-canvas" />
                          <div className="urdf-viewer-overlay">Loading rover model…</div>
                        </div>
                      }>
                        <URDFViewer />
                      </Suspense>
                    </div>
                    <div className="rover-dropdown-info">
                      {p.subtitle && <p className="dropdown-text">{p.subtitle}</p>}
                      {p.steps && p.steps.length > 0 && (
                        <ul className="rover-steps-list">
                          {p.steps.map((step) => (
                            <li key={step.kicker}>
                              <span className="rover-step-tag">{step.kicker}</span>
                              {step.summary}
                            </li>
                          ))}
                        </ul>
                      )}
                      {p.skills && p.skills.length > 0 && (
                        <p className="skills">{p.skills.join(' · ')}</p>
                      )}
                    </div>
                  </div>
                ) : getYouTubeEmbedUrl(p.video) ? (
                  /* Video on left, GitHub card + content on right */
                  <div className="item-dropdown-content gh-dropdown-content">
                    <div className="gh-dropdown-col-card">
                      <div className="video-wrap">
                        <iframe
                          src={getYouTubeEmbedUrl(p.video) as string}
                          title={`${p.title} video`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                      {getGitHubUrl(p) && <GitHubCard url={getGitHubUrl(p)!} />}
                    </div>
                    <div className="gh-dropdown-col-info">
                      {p.description && <p className="dropdown-text">{p.description}</p>}
                      {p.skills && p.skills.length > 0 && (
                        <p className="skills">{p.skills.join(' · ')}</p>
                      )}
                      {p.links && p.links.length > 0 && (
                        <ul className="dropdown-links">
                          {p.links.map((l, idx) => (
                            <li key={idx}>
                              <a href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : getPaperUrl(p) ? (
                  /* GitHub card + paper on left, content on right */
                  <div className="item-dropdown-content gh-dropdown-content">
                    <div className="gh-dropdown-col-card">
                      {getGitHubUrl(p) && <GitHubCard url={getGitHubUrl(p)!} />}
                      {(() => {
                        const paperUrl = getPaperUrl(p)!
                        const embedUrl = getDriveEmbedUrl(paperUrl)
                        return (
                          <div className="paper-preview">
                            {embedUrl
                              ? <iframe src={embedUrl} className="paper-preview-iframe" title="Paper preview" allow="autoplay" />
                              : (
                                <div className="paper-preview-placeholder">
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v1H8zm0-3h8v1H8zm0-3h5v1H8z"/></svg>
                                  <span>View paper</span>
                                </div>
                              )
                            }
                            <a href={paperUrl} target="_blank" rel="noreferrer" className="paper-preview-overlay"><span>View paper ↗</span></a>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="gh-dropdown-col-info">
                      {p.description && <p className="dropdown-text">{p.description}</p>}
                      {p.skills && p.skills.length > 0 && (
                        <p className="skills">{p.skills.join(' · ')}</p>
                      )}
                      {p.links && p.links.length > 0 && (
                        <ul className="dropdown-links">
                          {p.links.map((l, idx) => (
                            <li key={idx}>
                              <a href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  /* No video, no paper — GitHub card on left, content on right */
                  <div className={`item-dropdown-content${getGitHubUrl(p) ? ' gh-dropdown-content' : ''}`}>
                    {getGitHubUrl(p) && (
                      <div className="gh-dropdown-col-card">
                        <GitHubCard url={getGitHubUrl(p)!} />
                      </div>
                    )}
                    <div className="gh-dropdown-col-info">
                      {p.description && <p className="dropdown-text">{p.description}</p>}
                      {p.skills && p.skills.length > 0 && (
                        <p className="skills">{p.skills.join(' · ')}</p>
                      )}
                      {p.links && p.links.length > 0 && (
                        <ul className="dropdown-links">
                          {p.links.map((l, idx) => (
                            <li key={idx}>
                              <a href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
