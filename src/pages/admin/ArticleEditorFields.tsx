import { articleEditLimits } from '../../articleEdits/articleEdit'
import {
  figureIds,
  type MarkdownProblem,
} from '../../articleEdits/articleMarkdown'
import { InfoTip } from './InfoTip'
import type { ArticleDraft } from './useArticleDraft'
import './admin.css'
import './ArticleEditorPage.css'

const syntaxHelp = `Blank lines separate blocks. ## starts a section heading. Lists use - item or 1. item. Inline: **bold**, \`code\`, [label](/path or https://…). A table is a Table: caption line, then | a | b |, | --- | --- | and its rows. A figure is ![label](figure:id), with id ${figureIds.join(' or ')}.`

export function ArticleEditorFields({
  draft,
  problems,
  onChange,
}: {
  draft: ArticleDraft
  problems: MarkdownProblem[]
  onChange: (patch: Partial<ArticleDraft>) => void
}) {
  return (
    <>
      <label className="article-editor-field">
        <span>Title</span>
        <input
          className="article-editor-input"
          value={draft.title}
          maxLength={articleEditLimits.title}
          required
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>
      <label className="article-editor-field">
        <span>Summary</span>
        <textarea
          className="article-editor-input"
          rows={3}
          value={draft.dek}
          maxLength={articleEditLimits.dek}
          required
          onChange={(event) => onChange({ dek: event.target.value })}
        />
      </label>
      <div className="article-editor-row">
        <label className="article-editor-field">
          <span>Tags, separated by commas</span>
          <input
            className="article-editor-input"
            value={draft.tags}
            onChange={(event) => onChange({ tags: event.target.value })}
          />
        </label>
        <label className="article-editor-field">
          <span>Published</span>
          <input
            className="article-editor-input"
            type="date"
            value={draft.published}
            required
            onChange={(event) => onChange({ published: event.target.value })}
          />
        </label>
      </div>
      <div className="article-editor-field article-editor-body">
        <span className="article-editor-label">
          <label htmlFor="article-markdown">Article (Markdown)</label>
          <InfoTip label="Markdown syntax">{syntaxHelp}</InfoTip>
        </span>
        <textarea
          id="article-markdown"
          className="article-editor-input article-editor-markdown"
          value={draft.markdown}
          maxLength={articleEditLimits.markdown}
          spellCheck
          aria-describedby={problems.length ? 'article-problems' : undefined}
          onChange={(event) => onChange({ markdown: event.target.value })}
        />
      </div>
      {problems.length ? (
        <ul id="article-problems" className="article-editor-problems">
          {problems.map((problem, index) => (
            <li key={index}>
              Line {problem.line}: {problem.message}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
