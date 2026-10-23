import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { pageMeta } from '../../content/pageMeta'
import { siteOrigin } from '../../content/site'

export function PagePosition() {
  const { pathname, hash } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => {
    const metadata = pageMeta(pathname)
    document.title = metadata.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', metadata.description)
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', new URL(metadata.canonicalPath, siteOrigin).href)
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
