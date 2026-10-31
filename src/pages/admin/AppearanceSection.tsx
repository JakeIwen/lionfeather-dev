import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { draftFromActive } from 'theme-kit/core'
import { builtinThemes } from '../../appearance/siteTheme'
import { loadAppearance, themeStore } from './serverThemeStore'
import './admin.css'

type ThemeEditorPane = typeof import('./themeEditorPane')

export function AppearanceSection() {
  const library = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.snapshot,
  )
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(false)
  const pane = useRef<ThemeEditorPane | null>(null)

  useEffect(() => {
    let current = true
    loadAppearance().then(
      () => current && setLoaded(true),
      (failure) =>
        current && setError(messageOf(failure, 'Appearance did not load.')),
    )
    return () => {
      current = false
      pane.current?.removeThemeEditor()
    }
  }, [])

  async function open() {
    setOpening(true)
    setError('')
    try {
      pane.current ??= await import('./themeEditorPane')
      await pane.current.showThemeEditor()
    } catch (failure) {
      setError(messageOf(failure, 'The theme editor did not open.'))
    } finally {
      setOpening(false)
    }
  }

  // An active theme whose knobs match no saved theme reads as "<name> adjusted".
  const themeName = draftFromActive({
    builtins: builtinThemes,
    ...library,
  }).name
  return (
    <section className="admin-section" aria-labelledby="appearance-title">
      <div className="admin-section-head">
        <h2 id="appearance-title">Appearance</h2>
      </div>
      <p className="admin-theme-line">
        Active theme: <strong>{loaded ? themeName : 'Loading…'}</strong>
      </p>
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button"
          onClick={() => void open()}
          disabled={opening}
        >
          {opening ? 'Opening…' : 'Open theme editor'}
        </button>
      </div>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}

const messageOf = (failure: unknown, fallback: string) =>
  failure instanceof Error ? failure.message : fallback
