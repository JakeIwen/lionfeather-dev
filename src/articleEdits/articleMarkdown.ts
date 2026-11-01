// The Markdown the owner edits articles in, and its translation to and from
// article blocks. Shared by the Worker (which rejects a save that doesn't
// parse) and the app (which renders it). Blocks are separated by blank lines:
//
//   ## Section heading
//   A paragraph; its lines are joined with spaces.
//   - list item           (or `1. item` for a numbered list)
//   Table: caption        (then a | header | row, a | --- | row and body rows)
//   ![label](figure:id)   (a writing screenshot by its id; the label is ignored)
//
// Inline text keeps the renderer's syntax: **bold**, `code`, [label](href).
import type { ArticleBlock } from '../content/articles'
import { writingScreenshots, type Screenshot } from '../content/screenshots'

export type MarkdownProblem = { line: number; message: string }
export type ParsedArticle = {
  blocks: ArticleBlock[]
  problems: MarkdownProblem[]
}

const figures: readonly Screenshot[] = Object.values(writingScreenshots)
export const figureIds = figures.map((figure) => figure.id)

const headingLine = /^## +(\S.*)$/
const figureLine = /^!\[[^\]]*\]\(figure:([^)\s]+)\)$/
const bulletLine = /^[-*] +(\S.*)$/
const numberedLine = /^\d+\. +(\S.*)$/
const captionLine = /^Table: *(\S.*)$/
const tableLine = /^\|.*\|$/
const separatorCell = /^:?-+:?$/
const continuationLine = /^ {2,}\S/
const inlineLink = /\[[^\]]+\]\(([^)]+)\)/g
// Site routes, in-page anchors, web links and email; never a script URL.
const allowedHref = /^(\/|#|https?:\/\/|mailto:)/

/** The cells of a | a | b | row; `\|` is a literal pipe inside a cell. */
function tableCells(line: string): string[] {
  const inner = line.trim().slice(1, -1)
  return inner
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'))
}

function linkProblems(text: string, line: number): MarkdownProblem[] {
  return [...text.matchAll(inlineLink)]
    .filter((match) => !allowedHref.test(match[1]!))
    .map((match) => ({
      line,
      message: `Links must start with /, #, https://, http:// or mailto: (${match[1]}).`,
    }))
}

type Line = { text: string; number: number }

/** Splits the source into runs of non-blank lines. */
function paragraphsOf(markdown: string): Line[][] {
  const runs: Line[][] = []
  let run: Line[] = []
  markdown.split(/\r?\n/).forEach((text, index) => {
    if (text.trim() === '') {
      if (run.length) runs.push(run)
      run = []
    } else run.push({ text: text.trimEnd(), number: index + 1 })
  })
  if (run.length) runs.push(run)
  return runs
}

function parseList(run: Line[], ordered: boolean): ArticleBlock {
  const marker = ordered ? numberedLine : bulletLine
  const items: string[] = []
  for (const { text } of run) {
    const item = marker.exec(text)
    if (item) items.push(item[1]!)
    else items[items.length - 1] += ` ${text.trim()}`
  }
  return ordered
    ? { kind: 'list', ordered: true, items }
    : { kind: 'list', items }
}

function parseTable(
  run: Line[],
  problems: MarkdownProblem[],
): ArticleBlock | undefined {
  const [caption, header, separator, ...body] = run
  const problem = (line: Line | undefined, message: string) => {
    problems.push({ line: (line ?? run[0]!).number, message })
    return undefined
  }
  if (!header || !tableLine.test(header.text))
    return problem(
      header,
      'A Table: caption must be followed by a | header | row.',
    )
  const columns = tableCells(header.text)
  if (
    !separator ||
    !tableCells(separator.text).every((cell) => separatorCell.test(cell))
  )
    return problem(
      separator,
      'The row after a table header must be | --- | --- |.',
    )
  if (tableCells(separator.text).length !== columns.length)
    return problem(
      separator,
      `The separator row needs ${columns.length} cells.`,
    )
  const rows: string[][] = []
  for (const line of body) {
    if (!tableLine.test(line.text))
      return problem(line, 'Table rows start and end with |.')
    const cells = tableCells(line.text)
    if (cells.length !== columns.length)
      return problem(
        line,
        `This row has ${cells.length} cells; the header has ${columns.length}.`,
      )
    rows.push(cells)
  }
  return {
    kind: 'table',
    caption: captionLine.exec(caption!.text)![1]!,
    columns,
    rows,
  }
}

/** One block from a run of lines, or undefined after recording why not. */
function parseRun(
  run: Line[],
  problems: MarkdownProblem[],
): ArticleBlock | undefined {
  const first = run[0]!
  const single = (message: string) => {
    if (run.length === 1) return true
    problems.push({ line: run[1]!.number, message })
    return false
  }
  const heading = headingLine.exec(first.text)
  if (heading)
    return single('Leave a blank line after a heading.')
      ? { kind: 'heading', text: heading[1]! }
      : undefined
  if (first.text.startsWith('#')) {
    problems.push({
      line: first.number,
      message: 'Section headings use ## and a space.',
    })
    return undefined
  }
  const figure = figureLine.exec(first.text)
  if (figure) {
    const image = figures.find((candidate) => candidate.id === figure[1])
    if (!image) {
      problems.push({
        line: first.number,
        message: `No figure ${figure[1]}; use one of ${figureIds.join(', ')}.`,
      })
      return undefined
    }
    return single('Leave a blank line after a figure.')
      ? { kind: 'figure', image }
      : undefined
  }
  if (captionLine.test(first.text)) return parseTable(run, problems)
  const ordered = numberedLine.test(first.text)
  if (ordered || bulletLine.test(first.text)) {
    const marker = ordered ? numberedLine : bulletLine
    const stray = run.find(
      (line) => !marker.test(line.text) && !continuationLine.test(line.text),
    )
    if (stray) {
      problems.push({
        line: stray.number,
        message:
          'Indent a list item’s next line by two spaces, or leave a blank line before a paragraph.',
      })
      return undefined
    }
    return parseList(run, ordered)
  }
  return {
    kind: 'paragraph',
    text: run.map((line) => line.text.trim()).join(' '),
  }
}

export function parseArticleMarkdown(markdown: string): ParsedArticle {
  const problems: MarkdownProblem[] = []
  const blocks: ArticleBlock[] = []
  for (const run of paragraphsOf(markdown)) {
    for (const line of run)
      if (!figureLine.test(line.text))
        problems.push(...linkProblems(line.text, line.number))
    const block = parseRun(run, problems)
    if (block) blocks.push(block)
  }
  if (blocks.length === 0 && problems.length === 0)
    problems.push({ line: 1, message: 'The article needs some text.' })
  return { blocks, problems }
}

const escapeCell = (cell: string) => cell.replaceAll('|', '\\|')
const tableRow = (cells: string[]) => `| ${cells.map(escapeCell).join(' | ')} |`

const blockMarkdown: {
  [Kind in ArticleBlock['kind']]: (
    block: Extract<ArticleBlock, { kind: Kind }>,
  ) => string
} = {
  paragraph: ({ text }) => text,
  heading: ({ text }) => `## ${text}`,
  list: ({ ordered, items }) =>
    items
      .map((item, index) => `${ordered ? `${index + 1}.` : '-'} ${item}`)
      .join('\n'),
  table: ({ caption, columns, rows }) =>
    [
      `Table: ${caption}`,
      tableRow(columns),
      tableRow(columns.map(() => '---')),
      ...rows.map(tableRow),
    ].join('\n'),
  figure: ({ image }) => `![${image.label}](figure:${image.id})`,
}

/** The Markdown for blocks; parsing it gives the same blocks back. */
export function articleMarkdown(blocks: readonly ArticleBlock[]): string {
  return `${blocks
    .map((block) => blockMarkdown[block.kind](block as never))
    .join('\n\n')}\n`
}
