export const dashboardImageUrl = '/images/van-dashboard.png'

export default function DashboardScreenshot({
  loading = 'lazy',
}: {
  loading?: 'lazy' | 'eager'
}) {
  return (
    <img
      className="dashboard-screenshot"
      src={dashboardImageUrl}
      alt="Van dashboard showing networking, system health, storage, lighting, backups, media, and vehicle controls in a dark tile layout."
      width={2236}
      height={1710}
      loading={loading}
      decoding="async"
    />
  )
}
