import {
  articlePath,
  homePath,
  projectPath,
  recommendationPath,
  writingPath,
} from '../routes'
import { articles } from './articles'
import { projects, type ProjectSlug } from './projects'
import { recommendation } from './recommendation'
import {
  dashboardScreenshot,
  fieldworkScreenshots,
  formEngineImage,
  telemetryScreenshots,
} from './screenshots'
import { siteDescription, siteName } from './site'

export type PageMeta = {
  title: string
  description: string
  canonicalPath: string
  type: 'article' | 'website'
  image?: string
  published?: string
}

const projectImages: Partial<Record<ProjectSlug, string>> = {
  'van-dashboard': dashboardScreenshot.src,
  'form-engine': formEngineImage.src,
  fieldwork: fieldworkScreenshots.openings.src,
  'van-telemetry': telemetryScreenshots[0]?.src,
}

const homeMeta: PageMeta = {
  title: siteName,
  description: siteDescription,
  canonicalPath: homePath,
  type: 'website',
  image: dashboardScreenshot.src,
}

const pages: PageMeta[] = [
  homeMeta,
  {
    title: 'Writing · Jacob Iwen',
    description: siteDescription,
    canonicalPath: writingPath,
    type: 'website',
  },
  {
    title: 'Letter of recommendation · Jacob Iwen',
    description: recommendation.excerpt,
    canonicalPath: recommendationPath,
    type: 'website',
  },
  ...projects.map((project): PageMeta => ({
    title: `${project.title} · Jacob Iwen`,
    description: project.subtitle,
    canonicalPath: projectPath(project.slug),
    type: 'website',
    image: projectImages[project.slug],
  })),
  ...articles.map((article): PageMeta => ({
    title: `${article.title} · Jacob Iwen`,
    description: article.dek,
    canonicalPath: articlePath(article.slug),
    type: 'article',
    image: article.blocks.find((block) => block.kind === 'figure')?.image.src,
    published: article.published,
  })),
]

const metadataByPath = new Map(pages.map((page) => [page.canonicalPath, page]))
export const staticPaths = pages.map((page) => page.canonicalPath)

export function pageMeta(pathname: string): PageMeta {
  return (
    metadataByPath.get(pathname.replace(/\/+$/, '') || homePath) ?? homeMeta
  )
}
