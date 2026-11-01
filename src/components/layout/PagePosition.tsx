import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useArticles } from '../../articleEdits/currentArticles'
import { articlePageTitle, pageMeta } from '../../content/pageMeta'
import { siteOrigin } from '../../content/site'
import { articlePath } from '../../routes'

export function PagePosition() {
  const { pathname, hash } = useLocation()
  const previousPath = useRef(pathname)
  // An article edited on the site replaces the title and summary from the code.
  const edited = useArticles().find(
    (article) => articlePath(article.slug) === pathname.replace(/\/+$/, ''),
  )
  const title = edited ? articlePageTitle(edited.title) : undefined
  const description = edited?.dek
  useEffect(() => {
    const metadata = pageMeta(pathname)
    document.title = title ?? metadata.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description ?? metadata.description)
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
  }, [pathname, hash, title, description])
  return null
}
