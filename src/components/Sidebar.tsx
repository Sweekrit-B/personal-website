import { useEffect, useState } from 'react'
import type { Theme } from '../hooks/useTheme'

type SidebarProps = {
  theme: Theme
  onToggleTheme: () => void
}

export default function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    setCollapsed(stored === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside className={"sidebar" + (collapsed ? ' collapsed' : '')}>
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <button
            className="collapse-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <span className="collapse-toggle-icon" aria-hidden="true">
              {collapsed ? '☰' : '✕'}
            </span>
          </button>

          {!collapsed && (
            <button
              className={`theme-toggle ${theme}`}
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === 'dark' ? '✦' : '✧'}
              </span>
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to home"
          >
            <span className="nav-label">Home</span>
          </button>
          <button
            className="nav-button"
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="Scroll to projects"
          >
            <span className="nav-label">Projects</span>
          </button>
          <button
            className="nav-button"
            onClick={() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="Scroll to resume"
          >
            <span className="nav-label">Resume</span>
          </button>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </div>
    </aside>
  )
}
