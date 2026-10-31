import { useCallback, useEffect, useRef, useState } from 'react'
import { replaceSiteSettings } from '../../settings/currentSiteSettings'
import {
  siteSettingsProblem,
  type SiteSettings,
} from '../../settings/siteSettings'
import { getSettings, saveSettings } from './adminClient'

export type SaveStatus = {
  kind: 'idle' | 'saving' | 'saved' | 'error'
  text: string
}
const idle: SaveStatus = { kind: 'idle', text: '' }

const sameSettings = (a: SiteSettings, b: SiteSettings) =>
  JSON.stringify(a) === JSON.stringify(b)

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/** The saved settings, an editable draft of them, and save/revert for the difference. */
export function useSiteSettingsDraft() {
  const [saved, setSaved] = useState<SiteSettings | null>(null)
  const [draft, setDraft] = useState<SiteSettings | null>(null)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState<SaveStatus>(idle)
  const saving = useRef(false)
  const dirty = saved !== null && draft !== null && !sameSettings(saved, draft)

  useEffect(() => {
    let current = true
    getSettings().then(
      (settings) => {
        if (!current) return
        setSaved(settings)
        setDraft(settings)
      },
      (error) => {
        if (current) setLoadError(messageOf(error, 'Settings did not load.'))
      },
    )
    return () => {
      current = false
    }
  }, [])

  // Leaving with unsaved changes would silently drop them.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = useCallback((patch: Partial<SiteSettings>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setStatus((current) => (current.kind === 'saving' ? current : idle))
  }, [])

  const revert = useCallback(() => {
    setDraft(saved)
    setStatus(idle)
  }, [saved])

  const save = useCallback(async () => {
    // One save at a time; a second click while one is pending does nothing.
    if (!draft || saving.current) return
    const problem = siteSettingsProblem(draft)
    if (problem) {
      setStatus({ kind: 'error', text: `Not saved. ${problem}` })
      return
    }
    saving.current = true
    setStatus({ kind: 'saving', text: 'Saving…' })
    try {
      const next = await saveSettings(draft)
      setSaved(next)
      // Edits made while the save was pending stay in the draft.
      setDraft((current) =>
        current && sameSettings(current, draft) ? next : current,
      )
      replaceSiteSettings(next)
      setStatus({
        kind: 'saved',
        text: 'Saved. Visitors see these settings within 10 seconds.',
      })
    } catch (error) {
      setStatus({
        kind: 'error',
        text: `Not saved. ${messageOf(error, 'The save failed.')}`,
      })
    } finally {
      saving.current = false
    }
  }, [draft])

  return { draft, dirty, loadError, status, change, revert, save }
}
