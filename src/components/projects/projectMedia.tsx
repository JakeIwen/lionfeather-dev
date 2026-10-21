import type { ReactNode } from 'react'
import type { ProjectSlug } from '../../content/projects'
import { DashboardFigure } from './DashboardFigure'
import { DashboardScreenshot } from './DashboardScreenshot'
import { FieldworkGallery } from './FieldworkGallery'
import { FormEngineFigure } from './FormEngineFigure'
import { FormEnginePreview } from './FormEnginePreview'
import { SignalDiscovery } from './SignalDiscovery'
import { TelemetryGallery } from './TelemetryGallery'
import './DashboardScreenshot.css'
import './FormEnginePreview.css'

// The image on a homepage project card.
export const projectCardMedia: Partial<Record<ProjectSlug, ReactNode>> = {
  'van-dashboard': <DashboardScreenshot className="dashboard-card-image" />,
  'form-engine': <FormEnginePreview className="form-engine-card-image" />,
}

// The figures between a case study's summary and its write-up.
export const caseStudyMedia: Partial<Record<ProjectSlug, ReactNode>> = {
  'van-dashboard': <DashboardFigure />,
  'form-engine': <FormEngineFigure />,
  fieldwork: <FieldworkGallery />,
  'van-telemetry': (
    <>
      <TelemetryGallery />
      <SignalDiscovery />
    </>
  ),
}
