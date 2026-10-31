// Loaded on first use from the Appearance section, so theme-kit's editor stays
// out of the admin page's first load.
import { mountThemeEditor } from 'theme-kit'
import type { ThemeEditorElement } from 'theme-kit'
import { builtinThemes, siteKnobs } from '../../appearance/siteTheme'
import { themeModeControl } from '../../appearance/themeModeControl'
import { loadAppearance, themeStore } from './serverThemeStore'

let editor: ThemeEditorElement | undefined

export async function showThemeEditor() {
  await loadAppearance()
  editor ??= mountThemeEditor({
    knobs: siteKnobs,
    builtins: builtinThemes,
    store: themeStore,
    mode: themeModeControl,
  })
  editor.show()
}

/** Removes the pane (leaving the admin page); removal restores the active theme on the page. */
export function removeThemeEditor() {
  editor?.remove()
  editor = undefined
}
