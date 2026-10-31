// The Soft/Dark switch shown inside theme-kit's editor pane, backed by the same
// store as the header toggle. Used by the admin and development theme editors.
import type { ThemeModeControl } from 'theme-kit'
import { getMode, modeOptions, setMode, subscribeMode } from './appearanceMode'

export const themeModeControl: ThemeModeControl = {
  options: modeOptions,
  get: getMode,
  // The pane passes an option id; ignore anything else.
  set: (id) => {
    const option = modeOptions.find((candidate) => candidate.id === id)
    if (option) setMode(option.id)
  },
  subscribe: subscribeMode,
}
