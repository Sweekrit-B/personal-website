import { motion } from 'framer-motion'

type NavDrawerProps = {
  open: boolean
  onClose: () => void
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const go = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <>
      <div
        className={`nav-drawer-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`nav-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="nav-drawer-header">
          <button
            className="nav-drawer-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav className="nav-drawer-nav">
          <motion.button
            onClick={() => go(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            aria-label="Scroll to home"
            whileTap={{ scale: 0.96 }}
          >
            Home
          </motion.button>
          <motion.button
            onClick={() => go(() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to projects"
            whileTap={{ scale: 0.96 }}
          >
            Projects
          </motion.button>
          <motion.button
            onClick={() => go(() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to resume"
            whileTap={{ scale: 0.96 }}
          >
            Resume
          </motion.button>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </aside>
    </>
  )
}
