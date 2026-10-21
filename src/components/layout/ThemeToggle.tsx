import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'
const storageKey = 'lionfeather-theme-v1'

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const explicitChoice = useRef(savedTheme() !== null)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const syncThemeColor = () => {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', getComputedStyle(root).backgroundColor)
    }
    syncThemeColor()
    // Profile previews can change the paper color without changing appearance mode.
    const observer = new MutationObserver(syncThemeColor)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette', 'style'],
    })
    return () => observer.disconnect()
  }, [theme])

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      if (!explicitChoice.current) setTheme(system.matches ? 'dark' : 'light')
    }
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return
      const saved = savedTheme()
      explicitChoice.current = saved !== null
      setTheme(saved ?? (system.matches ? 'dark' : 'light'))
    }
    system.addEventListener('change', update)
    window.addEventListener('storage', sync)
    return () => {
      system.removeEventListener('change', update)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function select(value: Theme) {
    explicitChoice.current = true
    setTheme(value)
    try {
      localStorage.setItem(storageKey, value)
    } catch {
      /* The current tab still switches when storage is unavailable. */
    }
  }

  return (
    <div className="appearance-control" role="group" aria-label="Appearance">
      <button
        type="button"
        aria-pressed={theme === 'light'}
        onClick={() => select('light')}
      >
        <Sun size={14} aria-hidden="true" />
        Soft
      </button>
      <button
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => select('dark')}
      >
        <Moon size={14} aria-hidden="true" />
        Dark
      </button>
    </div>
  )
}
