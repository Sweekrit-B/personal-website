import { useEffect, useState } from 'react'

type Project = {
  title: string
  year?: string
  image?: string
  video?: string
  description?: string
  skills?: string[]
  links?: { label: string; href: string }[]
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

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}lib/project.json`)
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]))
  }, [])

  return (
    <section className="projects">
      <h2 className="section-title">Projects</h2>
      <ul className="list">
        {items.map((p, i) => (
          <li key={i} className="list-item">
            <button
              className={`item-button ${openIndex === i ? 'open' : ''}`}
              aria-expanded={openIndex === i}
              onClick={() => {
                setOpenIndex((prev) => (prev === i ? null : i))
              }}
            >
              <div className="item-left">
                <div className="item-title">{p.title}</div>
              </div>
              <div className="item-right">{p.year}</div>
            </button>

            {openIndex === i && (
              <div className="item-dropdown">
                <div className="item-dropdown-content">
                {p.image && !p.image.includes('empty.svg') && (
                  <img src={p.image} alt={p.title} className="detail-image" />
                )}

                {getYouTubeEmbedUrl(p.video) && (
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
                )}

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
          </li>
        ))}
      </ul>
    </section>
  )
}
