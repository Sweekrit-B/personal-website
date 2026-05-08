import './App.css'
import Sidebar from './components/Sidebar'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Resume from './pages/Resume'

export default function App() {
  const navigate = useNavigate()

  return (
    <div className="site-root">
      <div className="app-layout">
        <Sidebar />

        <div className="content-area">
          <main className="site-main">
            <Routes>
              <Route path="/" element={<Home onNavigate={(p: any) => navigate(p === 'home' ? '/' : `/${p}`)} />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/resume" element={<Resume />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}
