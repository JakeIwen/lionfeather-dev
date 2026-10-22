import { useState, type MouseEvent } from 'react'
import { ScreenshotViewer } from '../../components/screenshots/ScreenshotViewer'
import { useScreenshotViewer } from '../../components/screenshots/useScreenshotViewer'
import type { Article } from '../../content/articles'
import type { Screenshot } from '../../content/screenshots'
import { ArticleBlocks } from './ArticleBlocks'

export function ArticleBody({ article }: { article: Article }) {
  const viewer = useScreenshotViewer()
  const [index, setIndex] = useState(0)
  const images = article.blocks.flatMap((block) =>
    block.kind === 'figure' ? [block.image] : [],
  )

  function openFigure(image: Screenshot, event: MouseEvent<HTMLAnchorElement>) {
    setIndex(images.indexOf(image))
    viewer.open(event)
  }

  return (
    <>
      <ArticleBlocks blocks={article.blocks} onFigureOpen={openFigure} />
      {images.length > 0 && (
        <ScreenshotViewer
          title={article.title}
          images={images}
          index={index}
          onSelect={setIndex}
          viewer={viewer}
        />
      )}
    </>
  )
}
