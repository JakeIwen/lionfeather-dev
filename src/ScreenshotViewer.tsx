import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { Screenshot } from './screenshots'
import type { useScreenshotViewer } from './useScreenshotViewer'
import { useSwipe } from './useSwipe'
import { useViewerDialog } from './useViewerDialog'
import './screenshot-viewer.css'

type ViewerProps = {
  title: string
  images: readonly Screenshot[]
  index: number
  onSelect: (index: number) => void
  viewer: ReturnType<typeof useScreenshotViewer>
}

function useAdjacentImages(
  images: readonly Screenshot[],
  index: number,
  open: boolean,
) {
  useEffect(() => {
    if (!open || images.length < 2) return
    for (const direction of [-1, 1]) {
      const image = new Image()
      image.src =
        images[(index + direction + images.length) % images.length]!.src
    }
  }, [images, index, open])
}

export default function ScreenshotViewer({
  title,
  images,
  index,
  onSelect,
  viewer,
}: ViewerProps) {
  const [zoomed, setZoomed] = useState(false)
  const dialog = useViewerDialog(viewer.isOpen, viewer.opener)
  const labelId = useId()
  const image = images[index]!
  useAdjacentImages(images, index, viewer.isOpen)
  useEffect(() => {
    setZoomed(false)
  }, [index, viewer.isOpen])

  function move(direction: number) {
    onSelect((index + direction + images.length) % images.length)
  }

  function handleKeyDown(event: KeyboardEvent) {
    event.stopPropagation()
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    move(event.key === 'ArrowRight' ? 1 : -1)
  }

  return (
    <dialog
      className="screenshot-viewer"
      ref={dialog}
      aria-labelledby={labelId}
      aria-describedby={
        image.context === image.label ? undefined : `${labelId}-context`
      }
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault()
        viewer.close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) viewer.close()
      }}
    >
      <ViewerToolbar
        title={title}
        zoomed={zoomed}
        onZoom={() => setZoomed(!zoomed)}
        onClose={viewer.close}
      />
      <ViewerImage
        image={image}
        open={viewer.isOpen}
        zoomed={zoomed}
        onMove={move}
        onClose={viewer.close}
        multiple={images.length > 1}
      />
      <ViewerCaption
        image={image}
        labelId={labelId}
        index={index}
        count={images.length}
        onMove={move}
      />
    </dialog>
  )
}

function ViewerImage({
  image,
  open,
  zoomed,
  onMove,
  onClose,
  multiple,
}: {
  image: Screenshot
  open: boolean
  zoomed: boolean
  onMove: (direction: number) => void
  onClose: () => void
  multiple: boolean
}) {
  const pane = useRef<HTMLDivElement>(null)
  const swipe = useSwipe(onMove, !zoomed && multiple)
  useEffect(() => {
    pane.current?.scrollTo(0, 0)
  }, [image.id, open, zoomed])
  return (
    <div
      className={`viewer-pane${zoomed ? ' is-zoomed' : ''}`}
      ref={pane}
      tabIndex={0}
      role="region"
      aria-label={
        zoomed ? 'Full-resolution screenshot; scroll to pan' : 'Screenshot'
      }
      {...swipe}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          draggable={false}
        />
      )}
    </div>
  )
}

function ViewerToolbar({
  title,
  zoomed,
  onZoom,
  onClose,
}: {
  title: string
  zoomed: boolean
  onZoom: () => void
  onClose: () => void
}) {
  return (
    <header className="viewer-toolbar">
      <span>{title}</span>
      <button type="button" aria-pressed={zoomed} onClick={onZoom}>
        {zoomed ? 'Fit to screen' : 'Zoom to 100%'}
      </button>
      <button
        type="button"
        autoFocus
        aria-label="Close screenshot viewer"
        onClick={onClose}
      >
        <X size={22} aria-hidden="true" />
      </button>
    </header>
  )
}

function ViewerCaption({
  image,
  labelId,
  index,
  count,
  onMove,
}: {
  image: Screenshot
  labelId: string
  index: number
  count: number
  onMove: (direction: number) => void
}) {
  return (
    <footer className="viewer-caption">
      <div className="viewer-navigation">
        {count > 1 && (
          <button
            type="button"
            aria-label="Previous screenshot"
            onClick={() => onMove(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        )}
        <div className="viewer-label" aria-live="polite" aria-atomic="true">
          <strong id={labelId}>{image.label}</strong>
          {count > 1 && (
            <span>
              {index + 1} of {count}
            </span>
          )}
        </div>
        {count > 1 && (
          <button
            type="button"
            aria-label="Next screenshot"
            onClick={() => onMove(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
      {/* A lone image can have a caption that only repeats its label. */}
      {image.context !== image.label && (
        <p id={`${labelId}-context`}>{image.context}</p>
      )}
      <a href={image.src} target="_blank" rel="noreferrer">
        Open original <ArrowUpRight size={16} aria-hidden="true" />
        <span className="sr-only"> (new tab)</span>
      </a>
    </footer>
  )
}
