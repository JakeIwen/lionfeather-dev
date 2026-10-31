import { useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import {
  getMode,
  setMode,
  subscribeMode,
} from '../../appearance/appearanceMode'
import './ThemeToggle.css'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeMode, getMode)

  useEffect(() => {
    const root = document.documentElement
    const syncThemeColor = () => {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', getComputedStyle(root).backgroundColor)
    }
    syncThemeColor()
    // Theme previews change the paper color inline without changing the mode.
    const observer = new MutationObserver(syncThemeColor)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`appearance-control ${className}`}
      role="group"
      aria-label="Appearance"
    >
      <button
        type="button"
        aria-pressed={theme === 'light'}
        onClick={() => setMode('light')}
      >
        <Sun size={14} aria-hidden="true" />
        Soft
      </button>
      <button
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => setMode('dark')}
      >
        <Moon size={14} aria-hidden="true" />
        Dark
      </button>
    </div>
  )
}
