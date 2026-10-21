import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/manrope'
import '@fontsource/instrument-serif/latin-400-italic.css'
import './styles/index.css'
import { App } from './App'

if (import.meta.env.DEV) void import('./dev/mountPalettePanel')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
