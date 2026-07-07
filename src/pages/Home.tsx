import { useState } from 'react'
import { motion } from 'framer-motion'
import Card3D from '../components/Card3D'
import { Reveal } from '../components/Reveal'
import Projects from './Projects'
import Resume from './Resume'

export default function Home({ onNavigate: _onNavigate }: { onNavigate: (p: 'projects' | 'resume' | 'home') => void }) {
  const [selectedCardName, setSelectedCardName] = useState('lucario')
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
            <Card3D cardImageName={selectedCardName} />
            <Reveal className="profile-intro">
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
                  <motion.button
                    key={name}
                    type="button"
                    className={`evolution-chip${selectedCardName === name ? ' active' : ''}`}
                    onClick={() => setSelectedCardName(name)}
                    aria-label={`Show ${name} card`}
                    aria-pressed={selectedCardName === name}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <img src={`${import.meta.env.BASE_URL}gifs/${name}.gif`} alt={name} />
                  </motion.button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>

    <Reveal as="div" id="projects" className="section-wrapper">
      <Projects />
    </Reveal>

    <Reveal as="div" id="resume" className="section-wrapper">
      <Resume />
    </Reveal>
    </div>
  )
}
