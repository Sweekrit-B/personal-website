import { useEffect, useRef, useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import NavDrawer from './components/NavDrawer'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Resume from './pages/Resume'
import { useTheme } from './hooks/useTheme'

export type ScrollTarget = 'top' | 'projects' | 'resume'

function performScroll(target: ScrollTarget) {
  if (target === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, toggleTheme] = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pendingScroll = useRef<ScrollTarget | null>(null)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  // The home page's sections only exist in the DOM at "/" — if a scroll nav
  // is triggered from another route, navigate home first and finish the
  // scroll once that route has actually mounted.
  useEffect(() => {
    if (location.pathname === '/' && pendingScroll.current) {
      const target = pendingScroll.current
      pendingScroll.current = null
      requestAnimationFrame(() => requestAnimationFrame(() => performScroll(target)))
    }
  }, [location.pathname])

  const scrollToSection = (target: ScrollTarget) => {
    if (location.pathname !== '/') {
      pendingScroll.current = target
      navigate('/')
    } else {
      performScroll(target)
    }
  }

  return (
    <div className="site-root">
      <MobileHeader theme={theme} onToggleTheme={toggleTheme} onOpenDrawer={() => setDrawerOpen(true)} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={scrollToSection} />

      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} onNavigate={scrollToSection} />

        <div className="content-area">
          <main className="site-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/resume" element={<Resume />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}
