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

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const explicitChoice = useRef(savedTheme() !== null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#19231e' : '#f6f4ee')
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
