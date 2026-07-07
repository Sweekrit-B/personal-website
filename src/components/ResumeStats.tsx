import { useState } from 'react'

type Experience = { role: string; company: string }

type Seg = {
  label: string
  value: number
  color: string
  names: string[]
}

// Unique key per experience entry (role+company each have duplicates individually)
const key = (e: Experience) => `${e.role} @ ${e.company}`

const SHORT: Record<string, string> = {
  'Contract Full-Stack Software Engineer @ F3 Global':                           'F3 Global',
  'Autonomous Systems Software Engineer @ Yonder Dynamics':                      'Yonder Dynamics',
  'Data Science & Machine Learning Research Intern @ UC San Diego Health':       'UCSD Health Research',
  'Software Engineering Consultant @ The Kaizen Academy':                        'Kaizen Academy',
  'Systems Software Engineering Consultant @ Brain Corp':                        'Brain Corp',
  'AI/LLM & Backend Software Engineer @ Doe (YC S25)':                          'Doe (YC S25)',
  'Backend Software Engineering Intern @ Lion Street Financial':                 'Lion Street',
  'Software Engineering Consultant @ KlonIT AI':                                 'KlonIT AI',
  'Contract Full-Stack Software Engineer @ UC San Diego Health':                 'UCSD Health EdTech',
  'AI Systems Software Engineering Intern @ Voicebotics AI':                     'Voicebotics AI',
  'Data Science Consultant @ Out of the Blue AI':                                'Out of the Blue AI',
}

const DOMAIN_MAP: Record<string, string[]> = {
  'Contract Full-Stack Software Engineer @ F3 Global':                     ['Full Stack'],
  'Autonomous Systems Software Engineer @ Yonder Dynamics':                ['Systems / Robotics'],
  'Data Science & Machine Learning Research Intern @ UC San Diego Health': ['Data Science'],
  'Software Engineering Consultant @ The Kaizen Academy':                  ['Full Stack'],
  'Systems Software Engineering Consultant @ Brain Corp':                  ['Systems / Robotics'],
  'AI/LLM & Backend Software Engineer @ Doe (YC S25)':                    ['AI / LLM'],
  'Backend Software Engineering Intern @ Lion Street Financial':            ['AI / LLM'],
  'Software Engineering Consultant @ KlonIT AI':                           ['AI / LLM'],
  'Contract Full-Stack Software Engineer @ UC San Diego Health':           ['Full Stack'],
  'AI Systems Software Engineering Intern @ Voicebotics AI':               ['AI / LLM'],
  'Data Science Consultant @ Out of the Blue AI':                          ['Data Science'],
}

const LANG_MAP: Record<string, string[]> = {
  'Contract Full-Stack Software Engineer @ F3 Global':                     ['JavaScript'],
  'Autonomous Systems Software Engineer @ Yonder Dynamics':                ['Python', 'C++'],
  'Data Science & Machine Learning Research Intern @ UC San Diego Health': ['Python'],
  'Software Engineering Consultant @ The Kaizen Academy':                  ['JavaScript'],
  'Systems Software Engineering Consultant @ Brain Corp':                  ['JavaScript'],
  'AI/LLM & Backend Software Engineer @ Doe (YC S25)':                    ['Python'],
  'Backend Software Engineering Intern @ Lion Street Financial':            ['JavaScript'],
  'Software Engineering Consultant @ KlonIT AI':                           ['Python'],
  'Contract Full-Stack Software Engineer @ UC San Diego Health':           ['JavaScript'],
  'AI Systems Software Engineering Intern @ Voicebotics AI':               ['Python'],
  'Data Science Consultant @ Out of the Blue AI':                          ['Python'],
}

const DOMAIN_COLORS: Record<string, string> = {
  'AI / LLM':           '#818cf8',
  'Full Stack':         '#fbbf24',
  'Data Science':       '#34d399',
  'Systems / Robotics': '#fb923c',
}

const LANG_COLORS: Record<string, string> = {
  Python:     '#5ba3d8',
  JavaScript: '#f0db4f',
  'C++':      '#f472b6',
}

function buildSegs(
  items: Experience[],
  map: Record<string, string[]>,
  colors: Record<string, string>,
): Seg[] {
  const acc: Record<string, Set<string>> = {}
  for (const item of items) {
    const k = key(item)
    for (const cat of map[k] ?? []) {
      if (!acc[cat]) acc[cat] = new Set()
      acc[cat].add(k)
    }
  }
  return Object.keys(colors)
    .filter(c => acc[c])
    .map(c => ({
      label: c,
      value: acc[c].size,
      color: colors[c],
      names: [...acc[c]].map(k => SHORT[k] ?? k),
    }))
    .sort((a, b) => b.value - a.value)
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
}

function arcPath(cx: number, cy: number, or_: number, ir: number, a0: number, a1: number) {
  const GAP = 2.4
  const s = a0 + GAP / 2, e = a1 - GAP / 2
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
                {p.names.map(name => (
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

export default function ResumeStats({ experience }: { experience: Experience[] }) {
  if (!experience.length) return null
  const domainSegs = buildSegs(experience, DOMAIN_MAP, DOMAIN_COLORS)
  const langSegs   = buildSegs(experience, LANG_MAP,   LANG_COLORS)
  return (
    <div className="project-stats">
      <Donut segs={domainSegs} title="Domains" />
      <Donut segs={langSegs}   title="Primary Languages" />
    </div>
  )
}
