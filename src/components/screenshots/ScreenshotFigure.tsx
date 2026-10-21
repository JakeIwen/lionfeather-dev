import type { MouseEvent, ReactNode } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Screenshot } from '../../content/screenshots'
import { useSwipe } from './useSwipe'

type FigureProps = {
  image: Screenshot
  title: string
  id?: string
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void
  onMove?: (direction: number) => void
  children?: ReactNode
}

export function ScreenshotFigure({
  image,
  title,
  id,
  onOpen,
  onMove,
  children,
}: FigureProps) {
  const swipe = useSwipe((direction) => onMove?.(direction), !!onMove)
  return (
    <figure className="case-screenshot" id={id}>
      <div className={onMove ? 'gallery-stage' : undefined}>
        {onMove && <GalleryArrow direction={-1} id={id} onMove={onMove} />}
        <a
          className="screenshot-link viewer-trigger"
          href={image.src}
          aria-label={`Open full-size ${title} ${image.label.toLowerCase()} screenshot`}
          aria-haspopup="dialog"
          onClick={onOpen}
          {...swipe}
        >
          {children ?? (
            <img
              className="carousel-image"
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              decoding="async"
              draggable={false}
            />
          )}
        </a>
        {onMove && <GalleryArrow direction={1} id={id} onMove={onMove} />}
      </div>
      <figcaption>
        <span>{image.context}</span>
        <a
          className="viewer-caption-trigger"
          href={image.src}
          aria-haspopup="dialog"
          onClick={onOpen}
        >
          View full size <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  )
}

function GalleryArrow({
  direction,
  id,
  onMove,
}: {
  direction: number
  id?: string
  onMove: (direction: number) => void
}) {
  const Icon = direction === -1 ? ChevronLeft : ChevronRight
  return (
    <button
      className="gallery-arrow"
      type="button"
      aria-label={direction === -1 ? 'Previous screenshot' : 'Next screenshot'}
      aria-controls={id}
      onClick={() => onMove(direction)}
    >
      <Icon size={23} aria-hidden="true" />
    </button>
  )
}
