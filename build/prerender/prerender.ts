import type { Plugin } from 'vite'
import { pageMeta, staticPaths } from '../../src/content/pageMeta'
import { feedPath, homePath } from '../../src/routes'
import { renderFeed } from './renderFeed'
import { renderPageHead } from './renderPageHead'

const headSlot = /<!-- page-meta:start -->[\s\S]*?<!-- page-meta:end -->/

function routeHtml(template: string, pathname: string): string {
  if (!headSlot.test(template)) throw new Error('Missing page metadata slot.')
  return template.replace(
    headSlot,
    () =>
      `<!-- page-meta:start -->\n    ${renderPageHead(pageMeta(pathname))}\n    <!-- page-meta:end -->`,
  )
}

export function prerender(): Plugin {
  return {
    name: 'prerender-route-heads',
    enforce: 'post',
    transformIndexHtml(html) {
      return routeHtml(html, homePath)
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset')
        throw new Error('Missing built index.html.')
      const template = String(index.source)
      for (const pathname of staticPaths) {
        if (pathname === homePath) continue
        this.emitFile({
          type: 'asset',
          fileName: `${pathname.slice(1)}.html`,
          source: routeHtml(template, pathname),
        })
      }
      this.emitFile({
        type: 'asset',
        fileName: feedPath.slice(1),
        source: renderFeed(),
      })
    },
  }
}
