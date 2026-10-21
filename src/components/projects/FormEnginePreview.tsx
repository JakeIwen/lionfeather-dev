import { formEngineImage } from '../../content/screenshots'
import './FormEnginePreview.css'

export function FormEnginePreview({
  loading = 'lazy',
  className = '',
}: {
  loading?: 'lazy' | 'eager'
  className?: string
}) {
  return (
    <img
      className={
        className
          ? `form-engine-screenshot ${className}`
          : 'form-engine-screenshot'
      }
      src={formEngineImage.src}
      alt={formEngineImage.alt}
      width={formEngineImage.width}
      height={formEngineImage.height}
      loading={loading}
      decoding="async"
    />
  )
}
