import type { Theme } from '../hooks/useTheme'

type MobileHeaderProps = {
  theme: Theme
  onToggleTheme: () => void
  onOpenDrawer: () => void
}

export default function MobileHeader({ theme, onToggleTheme, onOpenDrawer }: MobileHeaderProps) {
  return (
    <header className="mobile-header">
      <button
        className="mobile-header-menu"
        onClick={onOpenDrawer}
        aria-label="Open navigation menu"
      >
        <span className="mobile-header-menu-icon" aria-hidden="true">☰</span>
      </button>

      <span className="mobile-header-title">Sweekrit Bhatnagar</span>

      <button
        className={`theme-toggle ${theme}`}
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span className="theme-toggle-icon" aria-hidden="true">
          {theme === 'dark' ? '✦' : '✧'}
        </span>
      </button>
    </header>
  )
}
