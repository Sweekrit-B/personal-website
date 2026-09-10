import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from 'react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force'
import {
  buildDomainClusters,
  type ClusterNode,
  type SkillGroup,
} from '../lib/skillClusters'

const W = 1120
const H = 1200
const RING = 88
const HUB_R = 26
const MOBILE_Q = '(max-width: 640px)'

const CATEGORY_COLORS: Record<string, string> = {
  'Languages & OS':        '#a78bfa',
  'Machine Learning':      '#fb7185',
  'Data':                  '#34d399',
  'Software Engineering':  '#fbbf24',
  'AI':                    '#818cf8',
  'Cloud':                 '#38bdf8',
  'Product & Communication': '#fb923c',
}
const FALLBACK = '#94a3b8'
const catColor = (c: string) => CATEGORY_COLORS[c] ?? FALLBACK

type SimNode = ClusterNode & {
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}
type SimLink = { source: SimNode | string; target: SimNode | string }

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export default function SkillConstellation({ groups }: { groups: SkillGroup[] }) {
  const isMobile = useMediaQuery(MOBILE_Q)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const base = useMemo(
    () => buildDomainClusters(groups, { w: W, h: H, ring: RING, maxCols: 2 }),
    [groups],
  )

  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [pinCat, setPinCat] = useState<string | null>(null)
  const shown = activeCat ?? pinCat
  const isOn = (cat: string) => !shown || shown === cat

  // ─── force layout ──────────────────────────────────────────
  const simNodes = useMemo<SimNode[]>(
    () =>
      base.nodes.map((n) =>
        n.kind === 'hub' ? { ...n, fx: n.x, fy: n.y } : { ...n },
      ),
    [base],
  )
  const simLinks = useMemo<SimLink[]>(
    () => base.links.map((l) => ({ ...l })),
    [base],
  )

  const [, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => (t + 1) % 1_000_000), [])
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (isMobile) return

    const sim = forceSimulation(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(RING).strength(0.7),
      )
      .force('charge', forceManyBody<SimNode>().strength((n) => (n.kind === 'hub' ? 0 : -40)))
      .force('collide', forceCollide<SimNode>().radius((n) => (n.kind === 'hub' ? HUB_R + 6 : 13)))
      .force('x', forceX<SimNode>((n) => n.hx).strength((n) => (n.kind === 'skill' ? 0.05 : 0)))
      .force('y', forceY<SimNode>((n) => n.hy).strength((n) => (n.kind === 'skill' ? 0.05 : 0)))

    if (reduceMotion) sim.alphaDecay(0.4)

    simRef.current = sim
    let i = 0
    sim.on('tick', () => {
      i += 1
      if (i % 2 === 0) bump()
    })
    sim.on('end', bump)

    return () => {
      sim.stop()
      sim.on('tick', null)
      sim.on('end', null)
      simRef.current = null
    }
  }, [simNodes, simLinks, isMobile, reduceMotion, bump])

  // ─── drag (skills only) ────────────────────────────────────
  const dragId = useRef<string | null>(null)

  const toSvg = (e: RPointerEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y }
  }

  const onSkillPointerDown = (e: RPointerEvent, id: string) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragId.current = id
    const n = simNodes.find((x) => x.id === id)
    if (n) {
      const p = toSvg(e)
      n.fx = p.x
      n.fy = p.y
    }
    simRef.current?.alphaTarget(0.3).restart()
  }

  const onPointerMove = (e: RPointerEvent) => {
    if (!dragId.current) return
    const n = simNodes.find((x) => x.id === dragId.current)
    if (n) {
      const p = toSvg(e)
      n.fx = p.x
      n.fy = p.y
      bump()
    }
  }

  const onPointerUp = () => {
    const n = simNodes.find((x) => x.id === dragId.current)
    if (n) {
      n.fx = null
      n.fy = null
    }
    dragId.current = null
    simRef.current?.alphaTarget(0)
  }

  if (base.hubs.length === 0) return null

  const totalSkills = base.nodes.filter((n) => n.kind === 'skill').length

  const header = (
    <div className="skc-head">
      <div>
        <p className="stat-card-title">Skills</p>
        <p className="skc-count">
          {totalSkills} skills across {base.hubs.length} areas
        </p>
      </div>
      <ul className="skc-legend">
        {base.hubs.map((h) => (
          <li
            key={h.category}
            className={`skc-legend-item${shown === h.category ? ' on' : ''}`}
            onMouseEnter={() => setActiveCat(h.category)}
            onMouseLeave={() => setActiveCat(null)}
            onClick={() => setPinCat((p) => (p === h.category ? null : h.category))}
          >
            <span className="skc-dot" style={{ background: catColor(h.category) }} />
            {h.category}
          </li>
        ))}
      </ul>
    </div>
  )

  // ─── mobile: grouped chips ─────────────────────────────────
  if (isMobile) {
    return (
      <div className="skill-constellation">
        {header}
        <div className="skc-mobile">
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <div key={g.category} className="skc-mgroup">
                <div className="skc-mgroup-title">
                  <span className="skc-dot" style={{ background: catColor(g.category) }} />
                  {g.category}
                </div>
                <div className="skc-chips">
                  {g.items.map((it) => (
                    <span
                      key={it}
                      className="skc-chip"
                      style={{ borderColor: catColor(g.category) }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  // ─── desktop: hub-and-spoke force graph ────────────────────
  const linkKey = (l: SimLink) => {
    const b = typeof l.target === 'string' ? l.target : (l.target as SimNode).id
    return b
  }

  // frame tightly to the hub grid so nothing is wasted; extra horizontal room
  // for the skill labels that appear on select
  const xs = base.hubs.map((h) => h.x)
  const ys = base.hubs.map((h) => h.y)
  const padX = 165
  const padY = 44
  const vbX = Math.min(...xs) - RING - padX
  const vbY = Math.min(...ys) - RING - padY
  const vbW = Math.max(...xs) - Math.min(...xs) + 2 * (RING + padX)
  const vbH = Math.max(...ys) - Math.min(...ys) + 2 * (RING + padY)

  return (
    <div className="skill-constellation">
      {header}
      <svg
        ref={svgRef}
        className="skc-svg"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        role="img"
        aria-label="Skill map — each category hub surrounded by its skills"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => setPinCat(null)}
      >
        <g className="skc-links">
          {simLinks.map((l) => {
            const s = l.source as SimNode
            const t = l.target as SimNode
            if (s.x == null || t.x == null) return null
            return (
              <line
                key={linkKey(l)}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                className="skc-link"
                style={{
                  stroke: catColor(t.category),
                  opacity: isOn(t.category) ? 0.28 : 0.05,
                }}
              />
            )
          })}
        </g>

        <g className="skc-nodes">
          {simNodes.map((n) => {
            if (n.x == null) return null
            const on = isOn(n.category)
            if (n.kind === 'hub') {
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`skc-node hub${pinCat === n.category ? ' pinned' : ''}`}
                  style={{ opacity: on ? 1 : 0.12 }}
                  onMouseEnter={() => setActiveCat(n.category)}
                  onMouseLeave={() => setActiveCat(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPinCat((p) => (p === n.category ? null : n.category))
                  }}
                >
                  <circle r={HUB_R} fill={catColor(n.category)} className="skc-shape" />
                  <text className="skc-hub-label" textAnchor="middle" y={HUB_R + 18}>
                    {n.label}
                  </text>
                </g>
              )
            }
            const leftSide = n.x < n.hx
            const labelled = shown === n.category
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                className="skc-node skill"
                style={{ opacity: on ? 1 : 0.1 }}
                onPointerDown={(e) => onSkillPointerDown(e, n.id)}
                onMouseEnter={() => setActiveCat(n.category)}
                onMouseLeave={() => setActiveCat(null)}
              >
                <circle
                  r={labelled ? 10 : 7}
                  fill={catColor(n.category)}
                  className="skc-shape"
                />
                {labelled && (
                  <text
                    className="skc-label skill"
                    x={leftSide ? -11 : 11}
                    dy="0.32em"
                    textAnchor={leftSide ? 'end' : 'start'}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <p className="skc-hint">Hover a category to isolate it · click to pin · drag skills to rearrange</p>
    </div>
  )
}
