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
          <button
            onClick={() => go(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            aria-label="Scroll to home"
          >
            Home
          </button>
          <button
            onClick={() => go(() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to projects"
          >
            Projects
          </button>
          <button
            onClick={() => go(() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
            aria-label="Scroll to resume"
          >
            Resume
          </button>
        </nav>

        <div className="sidebar-footer">© {new Date().getFullYear()}</div>
      </aside>
    </>
  )
}
