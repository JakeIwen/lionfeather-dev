// Apply the saved/system appearance before the application and styles paint.
;(function () {
  let saved = null
  try { saved = localStorage.getItem('lionfeather-theme-v1') } catch {}
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#19231e' : '#f6f4ee')
})()
