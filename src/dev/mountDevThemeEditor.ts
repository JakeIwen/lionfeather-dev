// Development only (main.tsx imports it behind import.meta.env.DEV): a fixed
// Theme button that opens theme-kit's editor pane, with themes kept in this
// browser's localStorage so nothing needs the Worker.
import { createLocalThemeStore, mountThemeEditor, paletteSwatchColors } from 'theme-kit'
import type { ThemeEditorElement } from 'theme-kit'
import { builtinThemes, siteKnobs } from '../appearance/siteTheme'
import { themeModeControl } from '../appearance/themeModeControl'
import './mountDevThemeEditor.css'

const buttonId = 'dev-theme-button'
document.getElementById(buttonId)?.remove()

const store = createLocalThemeStore({
  specs: siteKnobs,
  builtins: builtinThemes,
  storageKey: 'lionfeather-dev-theme-v1',
})

const button = document.createElement('button')
button.id = buttonId
button.type = 'button'
button.className = 'dev-theme-button'
button.textContent = 'Theme'
button.setAttribute('aria-haspopup', 'dialog')

// The pane is built on first click, like the admin page does.
let editor: ThemeEditorElement | undefined
button.addEventListener('click', () => {
  editor ??= mountThemeEditor({
    knobs: siteKnobs,
    builtins: builtinThemes,
    store,
    mode: themeModeControl,
    swatchColors: paletteSwatchColors(siteKnobs),
  })
  editor.toggle()
})
document.body.append(button)

if (import.meta.hot) {
  // Self-accepting, so editing this file re-mounts it instead of reloading the page.
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    editor?.remove()
    button.remove()
  })
}
