import { describe, it, expect } from 'vitest'
import { buildDomainClusters, hubPositions, hubId, skillNodeId } from './skillClusters'

const OPTS = { w: 1000, h: 800, ring: 100 }

describe('buildDomainClusters', () => {
  const groups = [
    { category: 'AI', items: ['LLMs', 'RAG', 'MCP'] },
    { category: 'Cloud', items: ['AWS', 'Docker'] },
  ]
  const g = buildDomainClusters(groups, OPTS)

  it('creates one hub per category plus one node per skill', () => {
    expect(g.nodes.filter((n) => n.kind === 'hub')).toHaveLength(2)
    expect(g.nodes.filter((n) => n.kind === 'skill')).toHaveLength(5)
    expect(g.hubs.map((h) => h.category)).toEqual(['AI', 'Cloud'])
  })

  it('links every skill to its hub', () => {
    expect(g.links).toHaveLength(5)
    expect(g.links.filter((l) => l.source === hubId('AI'))).toHaveLength(3)
    expect(g.links.every((l) => l.target.startsWith('skill:'))).toBe(true)
  })

  it('seeds skills on a ring at `ring` distance from their hub', () => {
    const hub = g.nodes.find((n) => n.id === hubId('AI'))!
    for (const s of g.nodes.filter((n) => n.category === 'AI' && n.kind === 'skill')) {
      const d = Math.hypot(s.x - hub.x, s.y - hub.y)
      expect(d).toBeCloseTo(OPTS.ring, 5)
      expect(s.hx).toBe(hub.x)
      expect(s.hy).toBe(hub.y)
    }
  })

  it('drops empty categories and de-dupes skills within a category', () => {
    const g2 = buildDomainClusters(
      [
        { category: 'Empty', items: [] },
        { category: 'Dup', items: ['X', 'X', 'Y'] },
      ],
      OPTS,
    )
    expect(g2.hubs.map((h) => h.category)).toEqual(['Dup'])
    expect(g2.nodes.filter((n) => n.kind === 'skill').map((n) => n.label)).toEqual(['X', 'Y'])
    expect(g2.nodes.find((n) => n.id === skillNodeId('Dup', 'X'))).toBeDefined()
  })
})

describe('hubPositions', () => {
  it('lays out up to 3 per row, centered', () => {
    const p = hubPositions(3, 1200, 900)
    expect(p.map((q) => q.x)).toEqual([300, 600, 900])
    expect(p.every((q) => q.y === 450)).toBe(true)
  })

  it('wraps to a second row past 3', () => {
    const p = hubPositions(5, 1200, 900)
    expect(p).toHaveLength(5)
    expect(p[3].y).toBeGreaterThan(p[0].y) // row 2 lower than row 1
    // last row has 2 items -> centered at thirds
    expect(p[3].x).toBeCloseTo(400)
    expect(p[4].x).toBeCloseTo(800)
  })
})
