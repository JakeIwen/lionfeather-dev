import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { checkCss } from './check-css.mjs'

function fixture(t, { files = {}, source = '', config } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lionfeather-css-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src/App.tsx'), source)
  writeFileSync(join(root, 'index.html'), '<main class="html-class"></main>')
  if (config) {
    mkdirSync(join(root, '.codeshape'), { recursive: true })
    writeFileSync(join(root, '.codeshape/config.json'), JSON.stringify(config))
  }
  for (const [name, contents] of Object.entries(files)) {
    const path = join(root, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }
  return root
}

// Assembled so the repo's own code-shape scan doesn't read this test file as
// carrying a size exemption.
const sizeExemption = ['codeshape:', 'allow-size'].join(' ')

function violationsFor(root, rule) {
  return checkCss({ root }).filter((violation) => violation.rule === rule)
}

test('size accepts the limit, rejects overflow, and requires an exemption reason', (t) => {
  const root = fixture(t, {
    config: { file_lines: 2 },
    files: { 'src/app.css': '.used {\n  display: block;\n}' },
    source: 'export const classes = "used"',
  })
  assert.deepEqual(violationsFor(root, 'size'), [
    {
      file: 'src/app.css',
      line: 3,
      rule: 'size',
      message: 'CSS file has 3 lines; limit is 2.',
    },
  ])

  writeFileSync(join(root, 'src/app.css'), '.used {\ndisplay: block;')
  assert.deepEqual(violationsFor(root, 'size'), [])

  writeFileSync(
    join(root, 'src/app.css'),
    `/* ${sizeExemption} generated selectors */\n.used {\n  display: block;\n}`,
  )
  assert.deepEqual(violationsFor(root, 'size'), [])

  writeFileSync(
    join(root, 'src/app.css'),
    `/* ${sizeExemption} */\n.used {\n  display: block;\n}`,
  )
  assert.equal(violationsFor(root, 'size').length, 1)
})

test('color-literal accepts tokens and palette literals but rejects CSS colors', (t) => {
  const root = fixture(t, {
    files: {
      'src/app.css': `
.hex { color: #abc; }
.function { color: rgb(1 2 3); }
.modern { color: oklch(50% 0.1 20); }
.named { color: rebeccapurple; }
.mixed { color: color-mix(in srgb, red, var(--ink)); }
.allowed {
  color: var(--ink);
  border-color: transparent currentColor inherit initial unset;
  background: color-mix(in srgb, var(--ink), var(--paper));
  background-image: url("icon-#fff-red.svg");
  content: "red #fff rgb(1 2 3)";
}
.marker { color: #def; } /* codeshape: allow-marker */
`,
      'src/styles/palette.css': `
:root { --ink: #123456; }
[data-theme="dark"] { --ink: rgb(1 2 3); color: black; }
`,
    },
    source:
      'export const classes = "hex function modern named mixed allowed marker"',
  })
  const violations = violationsFor(root, 'color-literal')
  assert.deepEqual(
    violations.map((violation) => violation.message),
    [
      'Color literal "#abc" must be defined in src/styles/palette.css.',
      'Color literal "rgb(" must be defined in src/styles/palette.css.',
      'Color literal "oklch(" must be defined in src/styles/palette.css.',
      'Color literal "rebeccapurple" must be defined in src/styles/palette.css.',
      'Color literal "red" must be defined in src/styles/palette.css.',
    ],
  )
})

test('color-literal checks TS and TSX strings without treating anchors as colors', (t) => {
  const root = fixture(t, {
    files: {
      'src/View.tsx': `
export const View = () => <svg fill="#fff" />
const allowed = "#recommendation #main #abcde"
const embedded = "color: #aabbcc"
const fn = 'hsl(0 0% 0%)'
const nested = \`\${true ? '#1234' : 'var(--ink)'}\`
const ignored = '#def' // codeshape: allow-marker
// const comment = '#000'
`,
    },
    source: `
const direct = '#abc'
const fn = "rgb(1 2 3)"
const ignored = '#def' // codeshape: allow-marker
`,
  })
  assert.deepEqual(
    violationsFor(root, 'color-literal').map((violation) => violation.message),
    [
      'Color literal "#abc" must be defined in src/styles/palette.css.',
      'Color literal "rgb(" must be defined in src/styles/palette.css.',
      'Color literal "#fff" must be defined in src/styles/palette.css.',
      'Color literal "#aabbcc" must be defined in src/styles/palette.css.',
      'Color literal "hsl(" must be defined in src/styles/palette.css.',
      'Color literal "#1234" must be defined in src/styles/palette.css.',
    ],
  )
})

test('theme-selector is limited to the palette and honors line markers', (t) => {
  const root = fixture(t, {
    files: {
      'src/app.css': `
[data-theme="dark"] { color: var(--ink); }
html[data-theme="soft"] { color: var(--ink); } /* codeshape: allow-marker */
`,
      'src/styles/palette.css':
        '[data-theme="dark"] { --ink: var(--dark-ink); }',
    },
  })
  assert.deepEqual(violationsFor(root, 'theme-selector'), [
    {
      file: 'src/app.css',
      line: 2,
      rule: 'theme-selector',
      message: 'Theme selectors belong in src/styles/palette.css.',
    },
  ])
})

test('unused-class uses whole source tokens and honors selector markers', (t) => {
  const root = fixture(t, {
    files: {
      'src/app.css': `
.used, .dynamic-slug, .html-class, .card-wide { display: block; }
.card { display: block; }
.unused { display: block; }
.ignored { display: block; } /* codeshape: allow-marker */
`,
    },
    source: 'export const classes = "used dynamic-slug card-wide"',
  })
  assert.deepEqual(
    violationsFor(root, 'unused-class').map((violation) => violation.message),
    [
      'Class ".card" is not referenced by src/**/*.{ts,tsx} or index.html.',
      'Class ".unused" is not referenced by src/**/*.{ts,tsx} or index.html.',
    ],
  )
})

test('duplicate-selector compares normalized lists in media and supports contexts', (t) => {
  const root = fixture(t, {
    files: {
      'src/a.css': `
.same, .other { display: block; }
@media (min-width: 10px) { .responsive { display: block; } }
@supports (display: grid) { .supported { display: grid; } }
@keyframes first { from { opacity: 0; } 50% { opacity: 1; } to { opacity: 0; } }
`,
      'src/b.css': `
.same,.other { display: flex; }
@media   (min-width: 10px) { .responsive { display: flex; } }
@media (max-width: 9px) { .responsive { display: none; } }
@supports   (display: grid) { .supported { display: block; } }
@keyframes second { from { opacity: 0; } 50% { opacity: 1; } to { opacity: 0; } }
`,
    },
    source: 'export const classes = "same other responsive supported"',
  })
  const violations = violationsFor(root, 'duplicate-selector')
  assert.equal(violations.length, 3)
  assert.ok(
    violations.every((violation) =>
      violation.message.includes('duplicates src/a.css:'),
    ),
  )
})

test('nesting rejects style rules inside style rules without mis-parsing them', (t) => {
  const root = fixture(t, {
    files: {
      'src/app.css': `
.flat { color: var(--ink); }
.parent {
  color: var(--ink);
  .child { color: var(--ink); }
}
`,
    },
    source: 'export const classes = "flat parent child"',
  })
  assert.deepEqual(violationsFor(root, 'nesting'), [
    {
      file: 'src/app.css',
      line: 5,
      rule: 'nesting',
      message: 'Nested style rule ".child" is not allowed.',
    },
  ])
})

test('tokenizer ignores comments, strings, and URL contents', (t) => {
  const root = fixture(t, {
    files: {
      'src/app.css': `
/* .dead { color: #fff; } [data-theme="dark"] */
.safe[data-label="}; .fake, red"] {
  content: "red; } .ghost { color: #fff";
  background-image: url("data:image/svg+xml,<svg fill='#fff'>{;}</svg>");
}
`,
    },
    source: 'export const classes = "safe"',
  })
  assert.deepEqual(checkCss({ root }), [])
})

test('the repository has no CSS code-shape violations', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const violations = checkCss({ root })
  const counts = Object.groupBy(violations, (violation) => violation.rule)
  const summary = Object.entries(counts)
    .map(([rule, items]) => `${rule}: ${items.length}`)
    .join(', ')
  assert.equal(violations.length, 0, summary || 'No violations')
})
