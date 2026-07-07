import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Theme } from '../hooks/useTheme'
import type { ScrollTarget } from '../App'

type SidebarProps = {
  theme: Theme
  onToggleTheme: () => void
  onNavigate: (target: ScrollTarget) => void
}

export default function Sidebar({ theme, onToggleTheme, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1')

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
          <motion.button
            className="nav-button"
            onClick={() => onNavigate('top')}
            aria-label="Scroll to home"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Home</span>
          </motion.button>
          <motion.button
            className="nav-button"
            onClick={() => onNavigate('projects')}
            aria-label="Scroll to projects"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Projects</span>
          </motion.button>
          <motion.button
            className="nav-button"
            onClick={() => onNavigate('resume')}
            aria-label="Scroll to resume"
            whileHover={{ x: 2 }}
          >
            <span className="nav-label">Resume</span>
          </motion.button>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </div>
    </aside>
  )
}
