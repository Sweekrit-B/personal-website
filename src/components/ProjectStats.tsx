import { useState } from 'react'

type Project = { title: string }

type Seg = {
  label: string
  value: number
  color: string
  projects: string[]
}

const SHORT: Record<string, string> = {
  'Yonder Dynamics - Mars Rover Team @ UCSD': 'Mars Rover Team',
  'Climate Projections and the Future of Storms': 'Climate Projections',
  'Hantavirus Modeling and Prediction': 'Hantavirus Modeling',
  'Climate-Driven Power Outage Prediction': 'Power Outage ML',
  'Aletheia - Medical Aid & Pill Tracking Agentic AI Web App @ CalHacks AI 2025': 'Aletheia',
  'TallyUp - Hierarchal Club Finance Tracking App @ LA Hacks 2025': 'TallyUp',
  'ML Paper Recommender': 'Paper Recommender',
  'Airline Customer Satisfaction Prediction': 'Airline Satisfaction',
  'To Do List App': 'To Do List',
  'Bioinformatics Algorithms': 'Bioinformatics',
  'Calendar Application': 'Calendar App',
  'Epidemics.io': 'Epidemics.io',
}

const FIELD_MAP: Record<string, string[]> = {
  'Yonder Dynamics - Mars Rover Team @ UCSD':                                            ['Robotics', 'Machine Learning'],
  'Climate Projections and the Future of Storms':                                         ['Data Science', 'Data Visualization'],
  'Hantavirus Modeling and Prediction':                                                   ['Machine Learning', 'Data Science'],
  'Climate-Driven Power Outage Prediction':                                               ['Machine Learning', 'Data Science'],
  'Aletheia - Medical Aid & Pill Tracking Agentic AI Web App @ CalHacks AI 2025':        ['Machine Learning', 'Full Stack'],
  'TallyUp - Hierarchal Club Finance Tracking App @ LA Hacks 2025':                      ['Full Stack'],
  'ML Paper Recommender':                                                                 ['Machine Learning', 'Data Science'],
  'Airline Customer Satisfaction Prediction':                                             ['Machine Learning', 'Data Science'],
  'To Do List App':                                                                       ['Full Stack'],
  'Bioinformatics Algorithms':                                                            ['Data Science'],
  'Calendar Application':                                                                 ['Full Stack'],
  'Epidemics.io':                                                                         ['Data Science', 'Data Visualization'],
}

const LANG_MAP: Record<string, string[]> = {
  'Yonder Dynamics - Mars Rover Team @ UCSD':                                            ['Python', 'C++'],
  'Climate Projections and the Future of Storms':                                         ['JavaScript'],
  'Hantavirus Modeling and Prediction':                                                   ['Python'],
  'Climate-Driven Power Outage Prediction':                                               ['Python'],
  'Aletheia - Medical Aid & Pill Tracking Agentic AI Web App @ CalHacks AI 2025':        ['Python', 'JavaScript'],
  'TallyUp - Hierarchal Club Finance Tracking App @ LA Hacks 2025':                      ['JavaScript'],
  'ML Paper Recommender':                                                                 ['Python'],
  'Airline Customer Satisfaction Prediction':                                             ['Python'],
  'To Do List App':                                                                       ['JavaScript'],
  'Bioinformatics Algorithms':                                                            ['Python'],
  'Calendar Application':                                                                 ['Kotlin'],
  'Epidemics.io':                                                                         ['Python'],
}

const FIELD_COLORS: Record<string, string> = {
  'Machine Learning':    '#818cf8',
  'Data Science':        '#34d399',
  'Full Stack':          '#fbbf24',
  'Data Visualization':  '#22d3ee',
  'Robotics':            '#fb923c',
}

const LANG_COLORS: Record<string, string> = {
  Python:     '#5ba3d8',
  JavaScript: '#f0db4f',
  TypeScript: '#3178c6',
  'C++':      '#f472b6',
  Kotlin:     '#b08ef0',
}

function buildSegs(
  items: Project[],
  map: Record<string, string[]>,
  colors: Record<string, string>,
): Seg[] {
  const acc: Record<string, Set<string>> = {}
  for (const item of items) {
    for (const cat of map[item.title] ?? []) {
      if (!acc[cat]) acc[cat] = new Set()
      acc[cat].add(item.title)
    }
  }
  return Object.keys(colors)
    .filter(k => acc[k])
    .map(k => ({
      label: k,
      value: acc[k].size,
      color: colors[k],
      projects: [...acc[k]].map(t => SHORT[t] ?? t),
    }))
    .sort((a, b) => b.value - a.value)
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
}

function arcPath(cx: number, cy: number, or_: number, ir: number, a0: number, a1: number) {
  const GAP = 2.4
  const s = a0 + GAP / 2
  const e = a1 - GAP / 2
  if (e <= s) return ''
  const large = e - s > 180 ? 1 : 0
  const [ox0, oy0] = polar(cx, cy, or_, s)
  const [ox1, oy1] = polar(cx, cy, or_, e)
  const [ix0, iy0] = polar(cx, cy, ir, s)
  const [ix1, iy1] = polar(cx, cy, ir, e)
  return `M${ox0},${oy0} A${or_},${or_} 0 ${large},1 ${ox1},${oy1} L${ix1},${iy1} A${ir},${ir} 0 ${large},0 ${ix0},${iy0} Z`
}

function Donut({ segs, title }: { segs: Seg[]; title: string }) {
  const [hov, setHov] = useState<string | null>(null)
  const CX = 100, CY = 100, OR = 82, IR = 54

  const sum = segs.reduce((s, g) => s + g.value, 0)
  const paths = segs.map((seg, i) => {
    const start = -90 + segs.slice(0, i).reduce((s, g) => s + (g.value / sum) * 360, 0)
    const span = (seg.value / sum) * 360
    const d = arcPath(CX, CY, OR, IR, start, start + span)
    return { ...seg, d, i }
  })

  return (
    <div className="stat-card">
      <p className="stat-card-title">{title}</p>
      <div className="stat-card-body">

        <div className="stat-svg-wrap">
          <svg viewBox="0 0 200 200" className="stat-svg">
            {paths.map(p => (
              <path
                key={p.label}
                d={p.d}
                fill={p.color}
                className={`stat-arc stat-arc--${p.i}`}
                style={{
                  opacity: (hov !== null && hov !== p.label) ? 0.22 : undefined,
                  transform: hov === p.label ? 'scale(1.07)' : undefined,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: 'opacity 0.18s ease, transform 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHov(p.label)}
                onMouseLeave={() => setHov(null)}
              />
            ))}

          </svg>
        </div>

        <ul className="stat-legend">
          {paths.map(p => (
            <li
              key={p.label}
              className={`stat-leg${hov === p.label ? ' stat-leg--on' : ''}`}
              onMouseEnter={() => setHov(p.label)}
              onMouseLeave={() => setHov(null)}
            >
              <span className="stat-dot" style={{ background: p.color }} />
              <span className="stat-leg-label">{p.label}</span>
              <span className="stat-leg-n">{p.value}</span>
              <div className="stat-proj-pills">
                {p.projects.map(name => (
                  <span key={name} className="stat-proj-pill">{name}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>

      </div>
    </div>
  )
}

export default function ProjectStats({ items }: { items: Project[] }) {
  if (!items.length) return null
  const fieldSegs = buildSegs(items, FIELD_MAP, FIELD_COLORS)
  const langSegs  = buildSegs(items, LANG_MAP, LANG_COLORS)
  return (
    <div className="project-stats">
      <Donut segs={fieldSegs} title="Areas of Focus" />
      <Donut segs={langSegs}  title="Primary Languages" />
    </div>
  )
}
