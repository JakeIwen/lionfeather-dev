import { fieldworkScreenshots } from '../../content/screenshots'
import { ScreenshotCarousel } from '../screenshots/ScreenshotCarousel'

export function FieldworkGallery() {
  return (
    <ScreenshotCarousel
      title="Fieldwork"
      id="fieldwork"
      images={Object.entries(fieldworkScreenshots).map(([id, image]) => ({
        id,
        ...image,
      }))}
      className="fieldwork-gallery"
    />
  )
}
