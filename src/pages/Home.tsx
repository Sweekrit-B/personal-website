import { useState, useRef } from 'react'
import Card3D from '../components/Card3D'
import Projects from './Projects'
import Resume from './Resume'

export default function Home({ onNavigate: _onNavigate }: { onNavigate: (p: 'projects' | 'resume' | 'home') => void }) {
  const [selectedCardName, setSelectedCardName] = useState('lucario')
  const projectsRef = useRef<HTMLDivElement>(null)
  const resumeRef = useRef<HTMLDivElement>(null)
  const pokemonNames = ['lucario', 'espeon', 'flareon', 'glaceon', 'jolteon', 'leafeon', 'sylveon', 'umbreon', 'vaporeon']

  return (
    <div className="everything-wrapper">
    <section className="home home-reference">
      <div className="home-container">
        <div className="hero-profile">
          <div className="profile-name-row">
            <h1 className="profile-name">Sweekrit Bhatnagar</h1>
          </div>

          <div className="hero-content">
            <div className="profile-intro">
              <p>
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
                <a href="mailto:sweekritbh@gmail.com" target="_blank" rel="noreferrer">Email</a>
                <a href="https://www.instagram.com/sweekritbhatnagar/" target="_blank" rel="noreferrer">Instagram</a>
              </div>

              <div className="evolution-row" aria-label="Pokemon selectors">
                {pokemonNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`evolution-chip${selectedCardName === name ? ' active' : ''}`}
                    onClick={() => setSelectedCardName(name)}
                    aria-label={`Show ${name} card`}
                    aria-pressed={selectedCardName === name}
                  >
                    <img src={`${import.meta.env.BASE_URL}gifs/${name}.gif`} alt={name} />
                  </button>
                ))}
              </div>
            </div>
            <Card3D cardImageName={selectedCardName} />
          </div>
        </div>
      </div>
    </section>

    <div id="projects" ref={projectsRef} className="section-wrapper">
      <Projects />
    </div>

    <div id="resume" ref={resumeRef} className="section-wrapper">
      <Resume />
    </div>
    </div>
  )
}
