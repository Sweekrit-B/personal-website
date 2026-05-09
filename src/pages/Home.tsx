import { useEffect, useState } from 'react'

export default function Home({ onNavigate }: { onNavigate: (p: 'projects' | 'resume' | 'home') => void }) {
  const [projects, setProjects] = useState<{ title: string; year?: string }[]>([])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}lib/project.json`)
      .then((r) => r.json())
      .then((data: { title: string; year?: string }[]) => {
        setProjects(Array.isArray(data) ? data.slice(0, 3) : [])
      })
      .catch(() => setProjects([]))
  }, [])

  return (
    <section className="home home-reference">
      <div className="home-container">
        <div className="hero-profile">
          <h1 className="profile-name">Sweekrit Bhatnagar!</h1>
          <p className="profile-intro">
            I am a data science student at UCSD committed to leveraging data
            driven insights and delivering full stack AI-integrated software
            solutions. I have experience spanning healthcare, analytics,
            computational research, and software engineering. I learn fast,
            collaborate effectively, and apply innovative solutions to real
            problems.
          </p>

          <div className="social-row" aria-label="Social links">
            <a href="https://www.linkedin.com/in/sweekrit-bhatnagar/" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://github.com/Sweekrit-B/" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>

        <div className="home-block">
          <div className="block-heading-row">
            <h2 className="block-heading">Recent Projects</h2>
            <button className="block-action" type="button" onClick={() => onNavigate('projects')}>
              View all
            </button>
          </div>
          <ul className="recent-projects-list">
            {projects.map((project) => (
              <li key={project.title}>
                <button className="recent-project-row" type="button" onClick={() => onNavigate('projects')}>
                  <span className="recent-project-title">{project.title}</span>
                  <span className="recent-project-year">{project.year ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="home-actions">
          <button onClick={() => onNavigate('projects')}>See projects</button>
          <button onClick={() => onNavigate('resume')}>See resume</button>
        </div>
      </div>
    </section>
  )
}
