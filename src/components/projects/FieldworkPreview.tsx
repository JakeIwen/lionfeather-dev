import { fieldworkScreenshots } from '../../content/screenshots'
import type { FieldworkScreen } from '../../content/screenshots'

export function FieldworkPreview({
  screen = 'detail',
  loading = 'lazy',
}: {
  screen?: FieldworkScreen
  loading?: 'lazy' | 'eager'
}) {
  const image = fieldworkScreenshots[screen]
  return (
    <img
      className="fieldwork-screenshot"
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={loading}
      decoding="async"
    />
  )
}
