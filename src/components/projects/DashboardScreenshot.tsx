import { dashboardScreenshot } from '../../content/screenshots'

export function DashboardScreenshot({
  loading = 'lazy',
}: {
  loading?: 'lazy' | 'eager'
}) {
  return (
    <img
      className="dashboard-screenshot"
      src={dashboardScreenshot.src}
      alt={dashboardScreenshot.alt}
      width={dashboardScreenshot.width}
      height={dashboardScreenshot.height}
      loading={loading}
      decoding="async"
    />
  )
}
