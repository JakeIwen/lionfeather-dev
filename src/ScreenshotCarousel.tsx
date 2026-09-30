import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'

export type Screenshot = {
  id: string
  label: string
  src: string
  width: number
  height: number
  context: string
  alt: string
}

export default function ScreenshotCarousel({
  title,
  id,
  images,
  className = '',
}: {
  title: string
  id: string
  images: readonly Screenshot[]
  className?: string
}) {
  const [selection, setSelection] = useState(0)
  const thumbnails = useRef<HTMLDivElement>(null)
  const thumbnailButtons = useRef<
    Record<string, HTMLButtonElement | undefined>
  >({})
  const index = selection % images.length
  const image = images[index]!
  const screenId = `${id}-screen`

  useEffect(() => {
    const strip = thumbnails.current
    const button = thumbnailButtons.current[image.id]
    if (!strip || !button || strip.scrollWidth <= strip.clientWidth) return
    const left = button.offsetLeft
    if (left < strip.scrollLeft) strip.scrollLeft = left
    else if (left + button.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = left + button.offsetWidth - strip.clientWidth
    }
  }, [image.id])

  function move(direction: number) {
    const next = (index + direction + images.length) % images.length
    setSelection(next)
    return images[next]!
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = move(event.key === 'ArrowRight' ? 1 : -1)
    if ((event.target as HTMLElement).closest('.gallery-thumbnail')) {
      thumbnailButtons.current[next.id]?.focus({ preventScroll: true })
    }
  }

  return (
    <section
      className={`screenshot-carousel ${className}`}
      aria-label={`${title} screenshots`}
      aria-roledescription="carousel"
      onKeyDown={handleKeyDown}
    >
      <div className="gallery-heading">
        <div>
          <p className="eyebrow">EXPLORE THE APP</p>
          <p className="gallery-screen-title">{image.label}</p>
        </div>
        <div
          className="gallery-counter"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">{image.label}, screenshot </span>
          <strong>{index + 1}</strong>
          <span> of {images.length}</span>
        </div>
      </div>
      <figure className="case-screenshot" id={screenId}>
        <div className="gallery-stage">
          <button
            className="gallery-arrow"
            type="button"
            aria-label="Previous screenshot"
            aria-controls={screenId}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={23} aria-hidden="true" />
          </button>
          <a
            className="screenshot-link"
            href={image.src}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open full-size ${title} ${image.label.toLowerCase()} screenshot in a new tab`}
          >
            <img
              className="carousel-image"
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              decoding="async"
            />
          </a>
          <button
            className="gallery-arrow"
            type="button"
            aria-label="Next screenshot"
            aria-controls={screenId}
            onClick={() => move(1)}
          >
            <ChevronRight size={23} aria-hidden="true" />
          </button>
        </div>
        <figcaption>
          <span>{image.context}</span>
          <a href={image.src} target="_blank" rel="noreferrer">
            View full size <ArrowUpRight size={13} />
          </a>
        </figcaption>
      </figure>
      <div
        className="gallery-thumbnails"
        role="group"
        aria-label="Choose a screenshot"
        ref={thumbnails}
      >
        {images.map((item, position) => (
          <button
            className="gallery-thumbnail"
            key={item.id}
            type="button"
            aria-label={`Show screenshot ${position + 1} of ${images.length}: ${item.label}`}
            aria-pressed={index === position}
            aria-controls={screenId}
            ref={(button) => {
              thumbnailButtons.current[item.id] = button ?? undefined
            }}
            onClick={() => setSelection(position)}
          >
            <img
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              loading="lazy"
            />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
