import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_FILE_LINES = 800
const PALETTE_FILE = 'src/styles/palette.css'
const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black
  blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse
  chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
  darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta
  darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
  forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green
  greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender
  lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
  lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue
  lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
  mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff
  peru pink plum powderblue purple rebeccapurple red rosybrown royalblue
  saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
  slateblue slategray slategrey snow springgreen steelblue tan teal thistle
  tomato turquoise violet wheat white whitesmoke yellow yellowgreen`
    .split(/\s+/)
    .filter(Boolean),
)
const DECLARATION_AT_RULES = new Set([
  'counter-style',
  'font-face',
  'font-feature-values',
  'page',
  'property',
])

function filesUnder(directory, extensions) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return filesUnder(path, extensions)
      return entry.isFile() && extensions.has(extname(entry.name)) ? [path] : []
    })
    .sort()
}

function relativePath(root, path) {
  return relative(root, path).split(sep).join('/')
}

function lineLocator(text) {
  const starts = [0]
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') starts.push(index + 1)
  }
  return (offset) => {
    let low = 0
    let high = starts.length
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2)
      if (starts[middle] <= offset) low = middle
      else high = middle
    }
    return low + 1
  }
}

function consumeQuoted(text, start) {
  const quote = text[start]
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') index += 1
    else if (text[index] === quote) return index + 1
  }
  return text.length
}

function isCssUrlStart(text, index) {
  const previous = index > 0 ? text[index - 1] : ''
  return (
    text.slice(index, index + 4).toLowerCase() === 'url(' &&
    !/[A-Za-z0-9_-]/.test(previous)
  )
}

function consumeCssUrl(text, start) {
  for (let index = start + 4; index < text.length; index += 1) {
    if (text[index] === '\\') index += 1
    else if (text[index] === '"' || text[index] === "'")
      index = consumeQuoted(text, index) - 1
    else if (text[index] === ')') return index + 1
  }
  return text.length
}

function addMarkerLines(comment, start, lineAt, markerLines) {
  for (const match of comment.matchAll(/codeshape:\s*allow-marker\b/g)) {
    markerLines.add(lineAt(start + match.index))
  }
}

function stripCssComments(text) {
  const output = [...text]
  const lineAt = lineLocator(text)
  const markerLines = new Set()
  let hasSizeExemption = false
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '"' || text[index] === "'") {
      index = consumeQuoted(text, index) - 1
      continue
    }
    if (isCssUrlStart(text, index)) {
      index = consumeCssUrl(text, index) - 1
      continue
    }
    if (text[index] !== '/' || text[index + 1] !== '*') continue
    const close = text.indexOf('*/', index + 2)
    const end = close === -1 ? text.length : close + 2
    const comment = text.slice(index, end)
    const commentBody = text.slice(index + 2, close === -1 ? end : close)
    addMarkerLines(comment, index, lineAt, markerLines)
    if (/codeshape:\s*allow-size[ \t]+\S[^\r\n]*/.test(commentBody)) {
      hasSizeExemption = true
    }
    for (let cursor = index; cursor < end; cursor += 1) {
      if (output[cursor] !== '\n' && output[cursor] !== '\r') {
        output[cursor] = ' '
      }
    }
    index = end - 1
  }
  return { code: output.join(''), hasSizeExemption, markerLines }
}

function maskCssProtected(text) {
  const output = [...text]
  for (let index = 0; index < text.length; index += 1) {
    let end = index
    if (text[index] === '"' || text[index] === "'") {
      end = consumeQuoted(text, index)
    } else if (isCssUrlStart(text, index)) {
      end = consumeCssUrl(text, index)
    }
    if (end === index) continue
    for (let cursor = index; cursor < end; cursor += 1) {
      if (output[cursor] !== '\n' && output[cursor] !== '\r') {
        output[cursor] = ' '
      }
    }
    index = end - 1
  }
  return output.join('')
}

function normalizePrelude(prelude) {
  return prelude
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
}

function firstContentOffset(text, start, end) {
  while (start < end && /\s/.test(text[start])) start += 1
  return start
}

function findDeclarationColon(segment) {
  let parentheses = 0
  let brackets = 0
  for (let index = 0; index < segment.length; index += 1) {
    if (segment[index] === '"' || segment[index] === "'") {
      index = consumeQuoted(segment, index) - 1
      continue
    }
    if (isCssUrlStart(segment, index)) {
      index = consumeCssUrl(segment, index) - 1
      continue
    }
    if (segment[index] === '(') parentheses += 1
    else if (segment[index] === ')') parentheses = Math.max(0, parentheses - 1)
    else if (segment[index] === '[') brackets += 1
    else if (segment[index] === ']') brackets = Math.max(0, brackets - 1)
    else if (segment[index] === ':' && parentheses === 0 && brackets === 0)
      return index
  }
  return -1
}

function cssColorLiterals(value) {
  const masked = maskCssProtected(value)
  const matches = []
  const hex =
    /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![A-Za-z0-9_-])/gi
  const functions =
    /(?<![A-Za-z0-9_-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi
  for (const match of masked.matchAll(hex)) {
    matches.push({ index: match.index, text: match[0] })
  }
  for (const match of masked.matchAll(functions)) {
    matches.push({ index: match.index, text: match[0].trimEnd() })
  }
  for (const match of masked.matchAll(/[A-Za-z_-][A-Za-z0-9_-]*/g)) {
    if (
      NAMED_COLORS.has(match[0].toLowerCase()) &&
      masked[match.index - 1] !== '#'
    ) {
      matches.push({ index: match.index, text: match[0] })
    }
  }
  return matches.sort((left, right) => left.index - right.index)
}

function inspectDeclaration(state, start, end) {
  if (state.file === PALETTE_FILE || start >= end) return
  const segment = state.code.slice(start, end)
  const colon = findDeclarationColon(segment)
  if (colon === -1 || segment.trimStart().startsWith('@')) return
  const valueStart = start + colon + 1
  const value = state.code.slice(valueStart, end)
  for (const literal of cssColorLiterals(value)) {
    const line = state.lineAt(valueStart + literal.index)
    if (state.markerLines.has(line)) continue
    state.violations.push({
      file: state.file,
      line,
      rule: 'color-literal',
      message: `Color literal "${literal.text}" must be defined in ${PALETTE_FILE}.`,
    })
  }
}

function inspectSelector(state, selector, start, context) {
  const normalized = normalizePrelude(selector)
  if (!normalized) return
  const line = state.lineAt(start)
  const key = `${context.join(' > ') || '<top>'}\0${normalized}`
  const first = state.selectors.get(key)
  if (first) {
    state.violations.push({
      file: state.file,
      line,
      rule: 'duplicate-selector',
      message: `Selector "${normalized}" duplicates ${first.file}:${first.line} in the same at-rule context.`,
    })
  } else {
    state.selectors.set(key, { file: state.file, line })
  }

  const searchable = maskCssProtected(selector)
  const themeIndex = searchable.toLowerCase().indexOf('[data-theme')
  if (state.file !== PALETTE_FILE && themeIndex !== -1) {
    const themeLine = state.lineAt(start + themeIndex)
    if (!state.markerLines.has(themeLine)) {
      state.violations.push({
        file: state.file,
        line: themeLine,
        rule: 'theme-selector',
        message: `Theme selectors belong in ${PALETTE_FILE}.`,
      })
    }
  }

  for (const match of searchable.matchAll(/\.([A-Za-z_-][A-Za-z0-9_-]*)/g)) {
    const classLine = state.lineAt(start + match.index)
    if (state.sourceTokens.has(match[1]) || state.markerLines.has(classLine))
      continue
    state.violations.push({
      file: state.file,
      line: classLine,
      rule: 'unused-class',
      message: `Class ".${match[1]}" is not referenced by src/**/*.{ts,tsx} or index.html.`,
    })
  }
}

function atRuleFrame(prelude, parent) {
  const name = /^@([A-Za-z-]+)/.exec(prelude)?.[1].toLowerCase() ?? ''
  const context = [...parent.context]
  if (name === 'media' || name === 'supports') {
    context.push(normalizePrelude(prelude))
  }
  let kind = 'rules'
  if (/(?:^|-)keyframes$/.test(name)) kind = 'keyframes'
  else if (DECLARATION_AT_RULES.has(name)) kind = 'declarations'
  return {
    context,
    insideStyle: parent.insideStyle || parent.kind === 'style',
    kind,
    segmentStart: 0,
  }
}

function openCssBlock(state, stack, end) {
  const parent = stack.at(-1)
  const start = firstContentOffset(state.code, parent.segmentStart, end)
  const prelude = state.code.slice(start, end).trimEnd()
  parent.segmentStart = end + 1
  if (prelude.startsWith('@')) {
    const frame = atRuleFrame(prelude, parent)
    frame.segmentStart = end + 1
    stack.push(frame)
    return
  }

  if (parent.kind === 'keyframes') {
    stack.push({
      context: parent.context,
      insideStyle: false,
      kind: 'keyframe-step',
      segmentStart: end + 1,
    })
    return
  }

  const nested = parent.kind === 'style' || parent.insideStyle
  if (nested) {
    state.violations.push({
      file: state.file,
      line: state.lineAt(start),
      rule: 'nesting',
      message: `Nested style rule "${normalizePrelude(prelude)}" is not allowed.`,
    })
  } else {
    inspectSelector(state, prelude, start, parent.context)
  }
  stack.push({
    context: parent.context,
    insideStyle: true,
    kind: 'style',
    segmentStart: end + 1,
  })
}

function parseCss(state) {
  const stack = [
    { context: [], insideStyle: false, kind: 'rules', segmentStart: 0 },
  ]
  let parentheses = 0
  let brackets = 0
  for (let index = 0; index < state.code.length; index += 1) {
    const character = state.code[index]
    if (character === '"' || character === "'") {
      index = consumeQuoted(state.code, index) - 1
      continue
    }
    if (isCssUrlStart(state.code, index)) {
      index = consumeCssUrl(state.code, index) - 1
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (parentheses === 0 && brackets === 0 && character === '{') {
      openCssBlock(state, stack, index)
    } else if (parentheses === 0 && brackets === 0 && character === ';') {
      const frame = stack.at(-1)
      if (
        frame.kind === 'style' ||
        frame.kind === 'declarations' ||
        frame.kind === 'keyframe-step' ||
        (frame.kind === 'rules' && frame.insideStyle)
      ) {
        inspectDeclaration(state, frame.segmentStart, index)
      }
      frame.segmentStart = index + 1
    } else if (parentheses === 0 && brackets === 0 && character === '}') {
      if (stack.length === 1) continue
      const frame = stack.pop()
      if (
        frame.kind === 'style' ||
        frame.kind === 'declarations' ||
        frame.kind === 'keyframe-step' ||
        (frame.kind === 'rules' && frame.insideStyle)
      ) {
        inspectDeclaration(state, frame.segmentStart, index)
      }
      stack.at(-1).segmentStart = index + 1
    }
  }
}

function recordScriptComment(text, start, end, lineAt, markerLines) {
  addMarkerLines(text.slice(start, end), start, lineAt, markerLines)
}

function scanScript(text) {
  const lineAt = lineLocator(text)
  const markerLines = new Set()
  const strings = []
  const stack = [{ type: 'code', templateExpression: false, depth: 0 }]
  for (let index = 0; index < text.length; index += 1) {
    const frame = stack.at(-1)
    if (frame.type === 'template') {
      if (text[index] === '\\') index += 1
      else if (text[index] === '`') {
        strings.push({ start: frame.segmentStart, end: index + 1 })
        stack.pop()
      } else if (text[index] === '$' && text[index + 1] === '{') {
        strings.push({ start: frame.segmentStart, end: index })
        stack.push({ type: 'code', templateExpression: true, depth: 1 })
        index += 1
      }
      continue
    }

    if (text[index] === '/' && text[index + 1] === '/') {
      const end = text.indexOf('\n', index + 2)
      const stop = end === -1 ? text.length : end
      recordScriptComment(text, index, stop, lineAt, markerLines)
      index = stop - 1
    } else if (text[index] === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2)
      const stop = close === -1 ? text.length : close + 2
      recordScriptComment(text, index, stop, lineAt, markerLines)
      index = stop - 1
    } else if (text[index] === '"' || text[index] === "'") {
      const end = consumeQuoted(text, index)
      strings.push({ start: index, end })
      index = end - 1
    } else if (text[index] === '`') {
      stack.push({ type: 'template', segmentStart: index })
    } else if (frame.templateExpression && text[index] === '{') {
      frame.depth += 1
    } else if (frame.templateExpression && text[index] === '}') {
      frame.depth -= 1
      if (frame.depth === 0) {
        stack.pop()
        stack.at(-1).segmentStart = index + 1
      }
    }
  }
  return { lineAt, markerLines, strings }
}

function inspectScriptColors(text, file, violations) {
  const { lineAt, markerLines, strings } = scanScript(text)
  const hex =
    /([ '"`(:])(#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3}))(?![A-Za-z0-9_-])/gi
  const functions =
    /(?<![A-Za-z0-9_-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi
  for (const span of strings) {
    const value = text.slice(span.start, span.end)
    const matches = []
    for (const match of value.matchAll(hex)) {
      matches.push({ index: match.index + 1, text: match[2] })
    }
    for (const match of value.matchAll(functions)) {
      matches.push({ index: match.index, text: match[0].trimEnd() })
    }
    for (const literal of matches.sort(
      (left, right) => left.index - right.index,
    )) {
      const line = lineAt(span.start + literal.index)
      if (markerLines.has(line)) continue
      violations.push({
        file,
        line,
        rule: 'color-literal',
        message: `Color literal "${literal.text}" must be defined in ${PALETTE_FILE}.`,
      })
    }
  }
}

function lineLimit(root) {
  const path = join(root, '.codeshape/config.json')
  if (!existsSync(path)) return DEFAULT_FILE_LINES
  const configured = JSON.parse(readFileSync(path, 'utf8')).file_lines
  return configured ?? DEFAULT_FILE_LINES
}

function countLines(text) {
  if (!text) return 0
  const newlines = text.match(/\n/g)?.length ?? 0
  return newlines + (text.endsWith('\n') ? 0 : 1)
}

function sourceTokens(root, scriptFiles) {
  const paths = [...scriptFiles]
  const index = join(root, 'index.html')
  if (existsSync(index)) paths.push(index)
  const tokens = new Set()
  for (const path of paths) {
    for (const match of readFileSync(path, 'utf8').matchAll(
      /[A-Za-z0-9_-]+/g,
    )) {
      tokens.add(match[0])
    }
  }
  return tokens
}

export function checkCss({ root }) {
  const absoluteRoot = resolve(root)
  const sourceRoot = join(absoluteRoot, 'src')
  const cssFiles = filesUnder(sourceRoot, new Set(['.css']))
  const scriptFiles = filesUnder(sourceRoot, new Set(['.ts', '.tsx']))
  const selectors = new Map()
  const violations = []
  const limit = lineLimit(absoluteRoot)
  const tokens = sourceTokens(absoluteRoot, scriptFiles)

  for (const path of scriptFiles) {
    inspectScriptColors(
      readFileSync(path, 'utf8'),
      relativePath(absoluteRoot, path),
      violations,
    )
  }
  for (const path of cssFiles) {
    const text = readFileSync(path, 'utf8')
    const file = relativePath(absoluteRoot, path)
    const metadata = stripCssComments(text)
    const lines = countLines(text)
    if (lines > limit && !metadata.hasSizeExemption) {
      violations.push({
        file,
        line: limit + 1,
        rule: 'size',
        message: `CSS file has ${lines} lines; limit is ${limit}.`,
      })
    }
    parseCss({
      code: metadata.code,
      file,
      lineAt: lineLocator(text),
      markerLines: metadata.markerLines,
      selectors,
      sourceTokens: tokens,
      violations,
    })
  }
  return violations.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule) ||
      left.message.localeCompare(right.message),
  )
}

const modulePath = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const root = resolve(dirname(modulePath), '..')
  const violations = checkCss({ root })
  if (violations.length) {
    for (const violation of violations) {
      console.error(
        `${violation.file}:${violation.line} ${violation.rule} ${violation.message}`,
      )
    }
    process.exitCode = 1
  } else {
    console.log('CSS check OK')
  }
}
