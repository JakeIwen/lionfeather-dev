import type { ArticleBlock } from '../../content/articles'
import { ArticleInlineText } from './ArticleInlineText'
import './ArticleTable.css'

type TableBlock = Extract<ArticleBlock, { kind: 'table' }>

export function ArticleTable({ caption, columns, rows }: TableBlock) {
  return (
    <div
      className="article-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="article-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th scope="col" key={index}>
                <ArticleInlineText text={column} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  <ArticleInlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
