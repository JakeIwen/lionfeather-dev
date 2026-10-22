import { Link } from 'react-router-dom'
import './ArticleInlineText.css'

export function ArticleInlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong className="article-inline-strong" key={index}>
          <ArticleInlineText text={part.slice(2, -2)} />
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code className="article-inline-code" key={index}>
          {part.slice(1, -1)}
        </code>
      )
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (!link) return part
    const label = link[1]!
    const href = link[2]!
    const children = <ArticleInlineText text={label} />
    return href.startsWith('/') ? (
      <Link className="article-inline-link" to={href} key={index}>
        {children}
      </Link>
    ) : (
      <a
        className="article-inline-link"
        href={href}
        target="_blank"
        rel="noreferrer"
        key={index}
      >
        {children}
      </a>
    )
  })
}
