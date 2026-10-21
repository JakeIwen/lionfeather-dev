import { dashboardScreenshot } from '../../content/screenshots'
import './DashboardScreenshot.css'

export function DashboardScreenshot({
  loading = 'lazy',
  className = '',
}: {
  loading?: 'lazy' | 'eager'
  className?: string
}) {
  return (
    <img
      className={
        className ? `dashboard-screenshot ${className}` : 'dashboard-screenshot'
      }
      src={dashboardScreenshot.src}
      alt={dashboardScreenshot.alt}
      width={dashboardScreenshot.width}
      height={dashboardScreenshot.height}
      loading={loading}
      decoding="async"
    />
  )
}
