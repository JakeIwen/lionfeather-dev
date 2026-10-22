import type { ArticleBlock } from '../../content/articles'

const wordsPerMinute = 230

function blockText(block: ArticleBlock): string {
  if ('text' in block) return block.text
  if ('items' in block) return block.items.join(' ')
  if ('rows' in block) {
    return [block.caption, ...block.columns, ...block.rows.flat()].join(' ')
  }
  return block.image.context
}

export function articleReadingTime(blocks: readonly ArticleBlock[]) {
  const text = blocks
    .map(blockText)
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  const words = text.match(/\S+/g)?.length ?? 0
  return `${Math.max(1, Math.ceil(words / wordsPerMinute))} min read`
}
