import type { ArticleBlock } from '../../content/articles'
import { ArticleInlineText } from './ArticleInlineText'
import './ArticleList.css'

type ListBlock = Extract<ArticleBlock, { kind: 'list' }>

export function ArticleList({ ordered, items }: ListBlock) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <List className="article-list">
      {items.map((item, index) => (
        <li key={index}>
          <ArticleInlineText text={item} />
        </li>
      ))}
    </List>
  )
}
