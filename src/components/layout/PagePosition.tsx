import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { articles } from '../../content/articles'
import { projects } from '../../content/projects'
import { articlePath, projectPath, recommendationPath } from '../../routes'

export function PagePosition() {
  const { pathname, hash } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => {
    const project = projects.find((item) => pathname === projectPath(item.slug))
    const article = articles.find((item) => pathname === articlePath(item.slug))
    const titledPage = article ?? project
    document.title = titledPage
      ? `${titledPage.title} · Jacob Iwen`
      : pathname === recommendationPath
        ? 'Letter of recommendation · Jacob Iwen'
        : 'Jacob Iwen · Lionfeather'
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
      else window.scrollTo(0, 0)
      if (previousPath.current !== pathname) {
        document.getElementById('main')?.focus({ preventScroll: true })
      }
      previousPath.current = pathname
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}
