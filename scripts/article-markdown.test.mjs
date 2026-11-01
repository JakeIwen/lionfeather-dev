import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { loadModule } from './worker-harness.mjs'

let parse
let toMarkdown
let articles
before(async () => {
  const markdown = await loadModule('src/articleEdits/articleMarkdown.ts')
  parse = markdown.parseArticleMarkdown
  toMarkdown = markdown.articleMarkdown
  articles = (await loadModule('src/content/articles.ts')).articles
})

test('every article in the code survives a trip through Markdown', () => {
  for (const article of articles) {
    const { blocks, problems } = parse(toMarkdown(article.blocks))
    assert.deepEqual(problems, [], article.slug)
    assert.deepEqual(blocks, article.blocks, article.slug)
  }
})

test('each block kind parses from the documented syntax', () => {
  const { blocks, problems } = parse(
    [
      '## A heading',
      '',
      'A paragraph that',
      'wraps onto a second line with [a link](/writing).',
      '',
      '- one',
      '- two that',
      '  continues',
      '',
      '1. first',
      '2. second',
      '',
      'Table: Results',
      '| Measure | Result |',
      '| --- | :---: |',
      '| Pipes | a \\| b |',
      '',
      '![Anything](figure:llm-switchboard)',
    ].join('\n'),
  )
  assert.deepEqual(problems, [])
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ['heading', 'paragraph', 'list', 'list', 'table', 'figure'],
  )
  assert.equal(
    blocks[1].text,
    'A paragraph that wraps onto a second line with [a link](/writing).',
  )
  assert.deepEqual(blocks[2], {
    kind: 'list',
    items: ['one', 'two that continues'],
  })
  assert.equal(blocks[3].ordered, true)
  assert.deepEqual(blocks[4].rows, [['Pipes', 'a | b']])
  assert.equal(blocks[5].image.id, 'llm-switchboard')
})

const broken = {
  'a heading without ##': ['# Title', 1],
  'an unknown figure': ['![x](figure:nope)', 1],
  'a script link': ['Click [here](javascript:alert(1)).', 1],
  'a table row with the wrong cell count': [
    'Table: T\n| a | b |\n| --- | --- |\n| only one |',
    4,
  ],
  'a table without a separator row': ['Table: T\n| a | b |\n| c | d |', 3],
  'an unindented line inside a list': ['- item\nnot indented', 2],
  'text straight after a heading': ['## Heading\nbody', 2],
  'nothing at all': ['   \n\n', 1],
}
for (const [name, [markdown, line]] of Object.entries(broken)) {
  test(`${name} is reported with its line`, () => {
    const { problems } = parse(markdown)
    assert.equal(problems.length > 0, true)
    assert.equal(problems[0].line, line)
  })
}
