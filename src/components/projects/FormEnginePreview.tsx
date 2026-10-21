import { formEngineImage } from '../../content/screenshots'

export function FormEnginePreview({
  loading = 'lazy',
}: {
  loading?: 'lazy' | 'eager'
}) {
  return (
    <img
      className="form-engine-screenshot"
      src={formEngineImage.src}
      alt={formEngineImage.alt}
      width={formEngineImage.width}
      height={formEngineImage.height}
      loading={loading}
      decoding="async"
    />
  )
}
