import { Fragment, type MouseEvent, type ReactNode } from 'react'
import { ScreenshotFigure } from '../../components/screenshots/ScreenshotFigure'
import type { ArticleBlock, ArticleBlockKind } from '../../content/articles'
import type { Screenshot } from '../../content/screenshots'
import { ArticleInlineText } from './ArticleInlineText'
import { ArticleList } from './ArticleList'
import { ArticleTable } from './ArticleTable'
import './ArticleBlocks.css'

type FigureOpen = (
  image: Screenshot,
  event: MouseEvent<HTMLAnchorElement>,
) => void

type BlockOfKind<Kind extends ArticleBlockKind> = Extract<
  ArticleBlock,
  { kind: Kind }
>

const blockRenderers = {
  paragraph: ({ text }: BlockOfKind<'paragraph'>) => (
    <p className="article-paragraph">
      <ArticleInlineText text={text} />
    </p>
  ),
  heading: ({ text }: BlockOfKind<'heading'>) => (
    <h2 className="article-section-heading">{text}</h2>
  ),
  list: (block: BlockOfKind<'list'>) => <ArticleList {...block} />,
  table: (block: BlockOfKind<'table'>) => <ArticleTable {...block} />,
  figure: ({ image }: BlockOfKind<'figure'>, onOpen: FigureOpen) => (
    <div className="article-figure">
      <ScreenshotFigure
        image={image}
        title={image.label}
        onOpen={(event) => onOpen(image, event)}
      >
        <img
          className="article-figure-image"
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
        />
      </ScreenshotFigure>
    </div>
  ),
} satisfies Record<
  ArticleBlockKind,
  (block: never, onOpen: FigureOpen) => ReactNode
>

export function ArticleBlocks({
  blocks,
  onFigureOpen,
}: {
  blocks: readonly ArticleBlock[]
  onFigureOpen: FigureOpen
}) {
  return (
    <div className="article-blocks">
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {/* The discriminant selects the matching parameter type at runtime. */}
          {blockRenderers[block.kind](block as never, onFigureOpen)}
        </Fragment>
      ))}
    </div>
  )
}
