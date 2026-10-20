import ScreenshotFigure from './ScreenshotFigure'
import ScreenshotViewer from './ScreenshotViewer'
import { useScreenshotViewer } from './useScreenshotViewer'
import type { Screenshot } from './screenshots'

const dashboardImage: Screenshot = {
  id: 'dashboard',
  label: 'Van dashboard',
  src: '/images/van-dashboard.png',
  width: 2236,
  height: 1710,
  context: 'Van dashboard',
  alt: 'Van dashboard showing networking, system health, storage, lighting, backups, media, and vehicle controls in a dark tile layout.',
}
const images = [dashboardImage]

export function DashboardFigure() {
  const viewer = useScreenshotViewer()
  return (
    <>
      <ScreenshotFigure
        image={dashboardImage}
        title="Van dashboard"
        onOpen={viewer.open}
      >
        <DashboardScreenshot loading="eager" />
      </ScreenshotFigure>
      <ScreenshotViewer
        title="Van dashboard"
        images={images}
        index={0}
        onSelect={() => {}}
        viewer={viewer}
      />
    </>
  )
}

export default function DashboardScreenshot({
  loading = 'lazy',
}: {
  loading?: 'lazy' | 'eager'
}) {
  return (
    <img
      className="dashboard-screenshot"
      src={dashboardImage.src}
      alt={dashboardImage.alt}
      width={dashboardImage.width}
      height={dashboardImage.height}
      loading={loading}
      decoding="async"
    />
  )
}
