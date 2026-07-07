import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RevealGroup, RevealItem } from '../components/Reveal'
import ResumeStats from '../components/ResumeStats'

type Experience = {
  role: string
  company: string
  location?: string
  start?: string
  end?: string | null
  bullets?: string[]
}

type Education = {
  school?: string
  degree?: string
}

type Resume = {
  education?: Education
  experience?: Experience[]
  technicalSkills?: string[]
}

const LOGOS: Record<string, string[]> = {
  'Adobe':                 ['adobe.png'],
  'Yonder Dynamics':       ['yonder-dynamics.png'],
  'UC San Diego Health':   ['ucsd.png'],
  'Brain Corp':            ['braincorp.png'],
  'Doe (YC S25)':          ['doe.png', 'yc.png'],
  'Lion Street Financial': ['lion-street.png'],
  'Voicebotics AI':        ['voicebotics.png'],
  'Out of the Blue AI':    ['outoftheblue.png'],
  'F3 Global':             ['f3-global.png'],
  'SD County IT':          ['sdcounty.png'],
  'The Kaizen Academy':    ['kaizenacademy.png'],
}

export default function Resume() {
  const [resume, setResume] = useState<Resume | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}lib/resume.json`)
      .then((r) => r.json())
      .then((data) => setResume(data))
      .catch(() => setResume(null))
  }, [])

  return (
    <section className="resume">
      <h2 className="section-title">Resume</h2>

      {resume?.education && (
        <div className="resume-section">
          <h3>Education</h3>
          <div className="edu">
            <div className="edu-school">{resume.education.school}</div>
            <div className="edu-degree">{resume.education.degree}</div>
          </div>
        </div>
      )}

      {resume?.experience && <ResumeStats experience={resume.experience} />}

      {resume?.experience && (
        <div className="resume-section">
          <h3>Experience</h3>
          <RevealGroup as="ul" className="list">
            {resume.experience.map((e, idx) => (
              <RevealItem as="li" key={idx} className="list-item">
                <motion.button
                  className={`item-button ${openIndex === idx ? 'open' : ''}`}
                  aria-expanded={openIndex === idx}
                  onClick={() => {
                    setOpenIndex((prev) => (prev === idx ? null : idx))
                  }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="item-left">
                    {LOGOS[e.company]
                      ? LOGOS[e.company].map(file => (
                          <img
                            key={file}
                            src={`${import.meta.env.BASE_URL}company-logos/${file}`}
                            alt=""
                            className="company-logo"
                            onError={ev => { (ev.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ))
                      : <div className="company-logo company-logo-fallback">{e.company[0]}</div>
                    }
                    <div className="item-title">{e.role} — {e.company}</div>
                  </div>
                  <div className="item-right">{e.end ? `${e.start} - ${e.end}` : e.start}</div>
                </motion.button>

                {openIndex === idx && (
                  <div className="item-dropdown">
                    <div className="item-dropdown-content">
                    {e.location && <div className="detail-location">{e.location}</div>}
                    <ul className="dropdown-bullets">
                      {e.bullets?.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    </div>
                  </div>
                )}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </section>
  )
}
