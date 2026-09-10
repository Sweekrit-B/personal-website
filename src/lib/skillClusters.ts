// Pure layout for the skill map: one hub node per skill category, its skills
// seeded on a ring around it. d3-force then relaxes the ring; hubs stay pinned.

export type SkillGroup = { category: string; items: string[] }

export type ClusterNode = {
  id: string
  kind: 'hub' | 'skill'
  label: string
  category: string
  /** home hub position — skills are pulled back toward a ring around this */
  hx: number
  hy: number
  /** seed position */
  x: number
  y: number
}

export type ClusterLink = { source: string; target: string }

export type ClusterGraph = {
  nodes: ClusterNode[]
  links: ClusterLink[]
  hubs: { category: string; x: number; y: number }[]
}

export const hubId = (category: string) => `hub:${category}`
export const skillNodeId = (category: string, skill: string) => `skill:${category}:${skill}`

/** Lay categories out on a centered grid. */
export function hubPositions(
  count: number,
  w: number,
  h: number,
  maxCols = 3,
): { x: number; y: number }[] {
  const cols = Math.min(maxCols, Math.max(1, count))
  const rows = Math.ceil(count / cols)
  return Array.from({ length: count }, (_, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    // last row may be short — center it
    const inRow = r === rows - 1 ? count - cols * r : cols
    return {
      x: w * ((c + 1) / (inRow + 1)),
      y: h * ((r + 1) / (rows + 1)),
    }
  })
}

export function buildDomainClusters(
  groups: SkillGroup[],
  opts: { w: number; h: number; ring: number; maxCols?: number },
): ClusterGraph {
  const clean = groups.filter((g) => g.category && g.items.length > 0)
  const pos = hubPositions(clean.length, opts.w, opts.h, opts.maxCols)

  const nodes: ClusterNode[] = []
  const links: ClusterLink[] = []
  const hubs: { category: string; x: number; y: number }[] = []
  const seenSkill = new Set<string>()

  clean.forEach((g, i) => {
    const { x, y } = pos[i]
    hubs.push({ category: g.category, x, y })
    nodes.push({
      id: hubId(g.category),
      kind: 'hub',
      label: g.category,
      category: g.category,
      hx: x,
      hy: y,
      x,
      y,
    })

    const items = g.items.filter((it) => {
      const k = `${g.category}::${it}`
      if (seenSkill.has(k)) return false
      seenSkill.add(k)
      return true
    })

    items.forEach((it, j) => {
      const a = (j / items.length) * Math.PI * 2 - Math.PI / 2
      nodes.push({
        id: skillNodeId(g.category, it),
        kind: 'skill',
        label: it,
        category: g.category,
        hx: x,
        hy: y,
        x: x + Math.cos(a) * opts.ring,
        y: y + Math.sin(a) * opts.ring,
      })
      links.push({ source: hubId(g.category), target: skillNodeId(g.category, it) })
    })
  })

  return { nodes, links, hubs }
}
