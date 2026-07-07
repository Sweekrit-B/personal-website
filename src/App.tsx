import { useEffect, useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import NavDrawer from './components/NavDrawer'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Resume from './pages/Resume'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className="site-root">
      <MobileHeader theme={theme} onToggleTheme={toggleTheme} onOpenDrawer={() => setDrawerOpen(true)} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />

        <div className="content-area">
          <main className="site-main">
            <Routes>
              <Route path="/" element={<Home onNavigate={(p: 'projects' | 'resume' | 'home') => navigate(p === 'home' ? '/' : `/${p}`)} />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/resume" element={<Resume />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}
