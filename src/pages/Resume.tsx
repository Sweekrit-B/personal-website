import { useEffect, useState } from 'react'

type Experience = {
  role: string
  company: string
  location?: string
  start?: string
  end?: string | null
  bullets?: string[]
}

type Resume = {
  education?: any
  experience?: Experience[]
  technicalSkills?: any[]
}

export default function Resume() {
  const [resume, setResume] = useState<Resume | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch('/lib/resume.json')
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

      {resume?.experience && (
        <div className="resume-section">
          <h3>Experience</h3>
          <ul className="list">
            {resume.experience.map((e, idx) => (
              <li key={idx} className="list-item">
                <button
                  className={`item-button ${openIndex === idx ? 'open' : ''}`}
                  aria-expanded={openIndex === idx}
                  onClick={() => {
                    setOpenIndex((prev) => (prev === idx ? null : idx))
                  }}
                >
                  <div className="item-left">
                    <div className="item-title">{e.role} — {e.company}</div>
                  </div>
                  <div className="item-right">{e.end ? `${e.start} - ${e.end}` : e.start}</div>
                </button>

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
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
