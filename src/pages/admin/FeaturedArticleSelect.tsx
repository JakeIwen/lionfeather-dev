import { articles, type ArticleSlug } from '../../content/articles'
import './admin.css'

export function FeaturedArticleSelect({
  value,
  onChange,
}: {
  value: ArticleSlug
  onChange: (slug: ArticleSlug) => void
}) {
  return (
    <label className="admin-field">
      <span>Featured article</span>
      <select
        className="admin-select"
        value={value}
        onChange={(event) => {
          const slug = articles.find((a) => a.slug === event.target.value)?.slug
          if (slug) onChange(slug)
        }}
      >
        {articles.map((article) => (
          <option key={article.slug} value={article.slug}>
            {article.title}
            {article.unlisted ? ' (unlisted)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
