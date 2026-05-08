import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    setCollapsed(stored === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
    const nextTheme = savedTheme ?? (prefersLight ? 'light' : 'dark')
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

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
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === 'dark' ? '✦' : '✧'}
              </span>
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/projects" className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-label">Projects</span>
          </NavLink>
          <NavLink to="/resume" className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-label">Resume</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </div>
    </aside>
  )
}
