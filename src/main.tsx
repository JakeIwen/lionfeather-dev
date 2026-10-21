import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/manrope'
import '@fontsource/instrument-serif/latin-400-italic.css'
import './styles/index.css'
import App from './App'

if (import.meta.env.DEV) void import('./dev/mountPalettePanel')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
