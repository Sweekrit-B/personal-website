import { useEffect, useState } from 'react'
import SkillConstellation from '../components/SkillConstellation'
import type { SkillGroup } from '../lib/skillClusters'

export default function Skills() {
  const [groups, setGroups] = useState<SkillGroup[]>([])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}lib/resume.json`)
      .then((r) => r.json())
      .then((d) => setGroups(Array.isArray(d.technicalSkills) ? d.technicalSkills : []))
      .catch(() => setGroups([]))
  }, [])

  return (
    <section className="skills-page">
      <h2 className="section-title">Skills</h2>

      {groups.length > 0 && (
        <>
          <SkillConstellation groups={groups} />

          <div className="skc-catlist">
            {groups.map((group) => (
              <div key={group.category} className="skc-cat">
                <div className="skc-cat-name">{group.category}</div>
                <div className="skc-cat-items">
                  {group.items.map((it) => (
                    <span key={it} className="skc-cat-chip">{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
