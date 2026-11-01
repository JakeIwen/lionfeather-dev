// The articles this page shows: the code's, with the owner's saved edits the
// Worker injected laid over them, replaced when the owner saves so pages
// reached by in-app navigation show the new text. DOM-only, so the Worker
// never imports it.
import { useSyncExternalStore } from 'react'
import { articles, type Article, type ArticleSlug } from '../content/articles'
import {
  articleEditsElementId,
  normalizeArticleEdits,
  withArticleEdit,
  type ArticleEdit,
  type ArticleEdits,
} from './articleEdit'

// Present only when the Worker served the page; local builds show the code.
function injectedEdits(): unknown {
  const element = document.getElementById(articleEditsElementId)
  if (!element?.textContent) return undefined
  try {
    return JSON.parse(element.textContent)
  } catch {
    return undefined
  }
}

let edits = normalizeArticleEdits(injectedEdits())

const merge = (saved: ArticleEdits): Article[] =>
  articles.map((article) => {
    const edit = saved[article.slug]
    return edit ? withArticleEdit(article, edit) : article
  })

let current = merge(edits)
const listeners = new Set<() => void>()

const getArticles = () => current

/** Shows a saved edit, or the code's version when `edit` is undefined. */
export function replaceArticleEdit(slug: ArticleSlug, edit?: ArticleEdit) {
  edits = { ...edits, [slug]: edit }
  if (!edit) delete edits[slug]
  current = merge(edits)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useArticles = () => useSyncExternalStore(subscribe, getArticles)
