import { dashboardScreenshot } from '../../content/screenshots'
import { ScreenshotFigure } from '../screenshots/ScreenshotFigure'
import { ScreenshotViewer } from '../screenshots/ScreenshotViewer'
import { useScreenshotViewer } from '../screenshots/useScreenshotViewer'
import { DashboardScreenshot } from './DashboardScreenshot'

const images = [dashboardScreenshot]

export function DashboardFigure() {
  const viewer = useScreenshotViewer()
  return (
    <>
      <ScreenshotFigure
        image={dashboardScreenshot}
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
