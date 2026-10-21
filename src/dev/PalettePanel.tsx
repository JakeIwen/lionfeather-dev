import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Copy, Palette, RotateCcw, X } from 'lucide-react'
import './PalettePanel.css'

type KnobKey = 'hueNeutral' | 'hueBrand' | 'hueAccent' | 'chroma'
type CopyState = 'idle' | 'copied' | 'fallback'

type KnobDefinition = {
  key: KnobKey
  property: `--${string}`
  label: string
  min: number
  max: number
  step: number
  fallback: number
}

type KnobValues = Record<KnobKey, number>
type PaletteOverrides = Partial<KnobValues>

export type PersistedPaletteState = {
  palette: string | null
  overrides: PaletteOverrides
  open: boolean
}

type PalettePanelProps = {
  initialState: PersistedPaletteState
}

const storageKey = 'lionfeather-dev-palette-v1'
const root = document.documentElement
const knobDefinitions: readonly KnobDefinition[] = [
  {
    key: 'hueNeutral',
    property: '--hue-neutral',
    label: 'Neutral hue',
    min: 0,
    max: 360,
    step: 1,
    fallback: 122,
  },
  {
    key: 'hueBrand',
    property: '--hue-brand',
    label: 'Brand hue',
    min: 0,
    max: 360,
    step: 1,
    fallback: 150,
  },
  {
    key: 'hueAccent',
    property: '--hue-accent',
    label: 'Accent hue',
    min: 0,
    max: 360,
    step: 1,
    fallback: 40,
  },
  {
    key: 'chroma',
    property: '--chroma',
    label: 'Chroma',
    min: 0,
    max: 2,
    step: 0.05,
    fallback: 1,
  },
]

function defaultPaletteState(): PersistedPaletteState {
  return { palette: null, overrides: {}, open: false }
}

function boundedNumber(value: unknown, definition: KnobDefinition) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(definition.max, Math.max(definition.min, value))
}

function readPaletteState(): PersistedPaletteState {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '')
    if (!parsed || typeof parsed !== 'object') return defaultPaletteState()
    const saved = parsed as Record<string, unknown>
    const palette =
      typeof saved.palette === 'string' && saved.palette ? saved.palette : null
    const overrides: PaletteOverrides = {}
    const savedOverrides = saved.overrides
    if (savedOverrides && typeof savedOverrides === 'object') {
      for (const definition of knobDefinitions) {
        const value = boundedNumber(
          (savedOverrides as Record<string, unknown>)[definition.key],
          definition,
        )
        if (value !== undefined) overrides[definition.key] = value
      }
    }
    return { palette, overrides, open: saved.open === true }
  } catch {
    return defaultPaletteState()
  }
}

function savePaletteState(state: PersistedPaletteState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    /* Live controls still work when development storage is unavailable. */
  }
}

function setDocumentPalette(palette: string | null) {
  if (palette) root.dataset.palette = palette
  else delete root.dataset.palette
}

function clearInlineOverrides() {
  for (const definition of knobDefinitions) {
    root.style.removeProperty(definition.property)
  }
}

export function restorePaletteState() {
  const state = readPaletteState()
  setDocumentPalette(state.palette)
  clearInlineOverrides()
  for (const definition of knobDefinitions) {
    const value = state.overrides[definition.key]
    if (value !== undefined) {
      root.style.setProperty(definition.property, String(value))
    }
  }
  return state
}

function readKnobValue(definition: KnobDefinition) {
  const value = Number.parseFloat(
    getComputedStyle(root).getPropertyValue(definition.property),
  )
  return Number.isFinite(value) ? value : definition.fallback
}

function readKnobValues(): KnobValues {
  return {
    hueNeutral: readKnobValue(knobDefinitions[0]),
    hueBrand: readKnobValue(knobDefinitions[1]),
    hueAccent: readKnobValue(knobDefinitions[2]),
    chroma: readKnobValue(knobDefinitions[3]),
  }
}

function collectRulePalettes(rules: CSSRuleList, names: Set<string>) {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      const matches = rule.selectorText.matchAll(
        /\[data-palette\s*=\s*(?:(['"])([^'"]+)\1|([^\]\s'"]+))\s*\]/g,
      )
      for (const match of matches) names.add(match[2] ?? match[3])
      continue
    }
    if (rule instanceof CSSImportRule) {
      if (rule.styleSheet) collectSheetPalettes(rule.styleSheet, names)
      continue
    }
    const nested = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules
    if (nested) collectRulePalettes(nested, names)
  }
}

function collectSheetPalettes(sheet: CSSStyleSheet, names: Set<string>) {
  try {
    collectRulePalettes(sheet.cssRules, names)
  } catch {
    /* Cross-origin stylesheets are intentionally ignored. */
  }
}

function discoverPaletteProfiles() {
  const names = new Set<string>()
  for (const sheet of document.styleSheets) {
    collectSheetPalettes(sheet, names)
  }
  return [...names].sort((left, right) => left.localeCompare(right))
}

function formatValue(definition: KnobDefinition, value: number) {
  return definition.step === 1
    ? String(Math.round(value))
    : value.toFixed(2).replace(/\.?0+$/, '')
}

function customCss(values: KnobValues) {
  return `:root[data-palette='custom'] {
  --hue-neutral: ${formatValue(knobDefinitions[0], values.hueNeutral)};
  --hue-brand: ${formatValue(knobDefinitions[1], values.hueBrand)};
  --hue-accent: ${formatValue(knobDefinitions[2], values.hueAccent)};
  --chroma: ${formatValue(knobDefinitions[3], values.chroma)};
}`
}

function usePalettePersistence(
  open: boolean,
  palette: string | null,
  overrides: PaletteOverrides,
) {
  useEffect(() => {
    savePaletteState({ palette, overrides, open })
  }, [open, overrides, palette])
}

function useEscapeToClose(
  open: boolean,
  setOpen: (open: boolean) => void,
  toggle: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]'))
        return
      event.preventDefault()
      setOpen(false)
      requestAnimationFrame(() => toggle.current?.focus())
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, setOpen, toggle])
}

function useCssCopy(values: KnobValues) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const copyTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    },
    [],
  )

  async function copyCurrentCss() {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    try {
      await navigator.clipboard.writeText(customCss(values))
      setCopyState('copied')
      copyTimer.current = window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      setCopyState('fallback')
    }
  }

  return {
    copyState,
    copyCurrentCss,
    resetCopyState: () => setCopyState('idle'),
  }
}

function ProfileField({
  palette,
  profiles,
  onChange,
}: {
  palette: string | null
  profiles: string[]
  onChange: (palette: string | null) => void
}) {
  return (
    <label className="palette-panel__field">
      <span>Profile</span>
      <select
        value={palette ?? ''}
        onChange={(event) => onChange(event.currentTarget.value || null)}
      >
        <option value="">Default</option>
        {profiles.map((profile) => (
          <option key={profile} value={profile}>
            {profile}
          </option>
        ))}
      </select>
    </label>
  )
}

function KnobFields({
  values,
  onChange,
}: {
  values: KnobValues
  onChange: (definition: KnobDefinition, value: number) => void
}) {
  return (
    <div className="palette-panel__knobs">
      {knobDefinitions.map((definition) => (
        <label className="palette-panel__slider" key={definition.key}>
          <span>
            {definition.label}
            <output>{formatValue(definition, values[definition.key])}</output>
          </span>
          <input
            type="range"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={values[definition.key]}
            onChange={(event) =>
              onChange(definition, Number(event.currentTarget.value))
            }
          />
        </label>
      ))}
    </div>
  )
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="palette-panel__header">
      <h2>Palette</h2>
      <button
        className="palette-panel__icon-button"
        type="button"
        aria-label="Close palette controls"
        onClick={onClose}
      >
        <X size={17} aria-hidden="true" />
      </button>
    </header>
  )
}

function PanelActions({
  copyState,
  onReset,
  onCopy,
}: {
  copyState: CopyState
  onReset: () => void
  onCopy: () => void
}) {
  return (
    <div className="palette-panel__actions">
      <button type="button" onClick={onReset}>
        <RotateCcw size={15} aria-hidden="true" />
        Reset
      </button>
      <button type="button" onClick={onCopy}>
        <Copy size={15} aria-hidden="true" />
        {copyState === 'copied' ? 'Copied' : 'Copy CSS'}
      </button>
    </div>
  )
}

function CopyResult({
  copyState,
  values,
}: {
  copyState: CopyState
  values: KnobValues
}) {
  return (
    <>
      <div className="palette-panel__status" role="status" aria-live="polite">
        {copyState === 'copied' && 'CSS copied to the clipboard.'}
        {copyState === 'fallback' && 'Clipboard unavailable. Copy manually.'}
      </div>
      {copyState === 'fallback' && (
        <label className="palette-panel__fallback">
          <span>Custom palette CSS</span>
          <textarea readOnly value={customCss(values)} />
        </label>
      )}
    </>
  )
}

export default function PalettePanel({ initialState }: PalettePanelProps) {
  const [open, setOpen] = useState(initialState.open)
  const [palette, setPalette] = useState(initialState.palette)
  const [overrides, setOverrides] = useState(initialState.overrides)
  const [values, setValues] = useState(readKnobValues)
  const profiles = useMemo(discoverPaletteProfiles, [])
  const toggle = useRef<HTMLButtonElement>(null)
  const { copyState, copyCurrentCss, resetCopyState } = useCssCopy(values)
  usePalettePersistence(open, palette, overrides)
  useEscapeToClose(open, setOpen, toggle)

  function closePanel() {
    setOpen(false)
    requestAnimationFrame(() => toggle.current?.focus())
  }

  function choosePalette(nextPalette: string | null) {
    clearInlineOverrides()
    setDocumentPalette(nextPalette)
    setPalette(nextPalette)
    setOverrides({})
    setValues(readKnobValues())
    resetCopyState()
  }

  function changeKnob(definition: KnobDefinition, value: number) {
    const bounded = boundedNumber(value, definition)
    if (bounded === undefined) return
    root.style.setProperty(definition.property, String(bounded))
    setValues((current) => ({ ...current, [definition.key]: bounded }))
    setOverrides((current) => ({ ...current, [definition.key]: bounded }))
    resetCopyState()
  }

  return (
    <div className="palette-panel-shell">
      <button
        ref={toggle}
        className="palette-panel__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="palette-panel"
        hidden={open}
        onClick={() => setOpen(true)}
      >
        <Palette size={16} aria-hidden="true" />
        Palette
      </button>

      {open && (
        <section
          className="palette-panel"
          id="palette-panel"
          aria-label="Palette controls"
        >
          <PanelHeader onClose={closePanel} />
          <ProfileField
            palette={palette}
            profiles={profiles}
            onChange={choosePalette}
          />
          <KnobFields values={values} onChange={changeKnob} />
          <PanelActions
            copyState={copyState}
            onReset={() => choosePalette(null)}
            onCopy={() => void copyCurrentCss()}
          />
          <CopyResult copyState={copyState} values={values} />
        </section>
      )}
    </div>
  )
}
