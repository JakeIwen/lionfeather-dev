import type { ComponentType } from 'react'
import { projects, type Project } from '../../content/projects'
import { useSiteSettings } from '../../settings/currentSiteSettings'
import {
  isSelectedWorkCard,
  visibleIds,
  type SelectedWorkCardId,
  type SelectedWorkId,
} from '../../settings/siteSettings'
import { FieldworkFeature } from './FieldworkFeature'
import { PipelineFeature } from './PipelineFeature'
import { ProjectCard } from './ProjectCard'
import { TelemetryFeature } from './TelemetryFeature'
import { WritingFeature } from './WritingFeature'
import './SelectedWork.css'

type WorkRow =
  { key: string; cards: Project[] } | { key: string; Feature: ComponentType }

const features: Record<
  Exclude<SelectedWorkId, SelectedWorkCardId>,
  ComponentType
> = {
  'production-pipelines': PipelineFeature,
  'van-telemetry': TelemetryFeature,
  fieldwork: FieldworkFeature,
  'featured-article': WritingFeature,
}

const cardProject = (id: SelectedWorkCardId) =>
  projects.find((project) => project.slug === id)!

// Cards next to each other in the saved order share a two-column row.
function workRows(ids: SelectedWorkId[]): WorkRow[] {
  const rows: WorkRow[] = []
  for (const id of ids) {
    const last = rows.at(-1)
    if (!isSelectedWorkCard(id)) rows.push({ key: id, Feature: features[id] })
    else if (last && 'cards' in last) last.cards.push(cardProject(id))
    else rows.push({ key: id, cards: [cardProject(id)] })
  }
  return rows
}

export function SelectedWork() {
  const rows = workRows(visibleIds(useSiteSettings().selectedWork))
  if (rows.length === 0) return null
  return (
    <section
      className="work-section container"
      id="work"
      aria-labelledby="work-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">A FEW THINGS I'VE BUILT</p>
          <h2 id="work-title">
            Selected <em>work.</em>
          </h2>
        </div>
      </div>
      <div className="work-blocks">
        {rows.map((row) =>
          'cards' in row ? (
            <div className="project-grid" key={row.key}>
              {row.cards.map((project) => (
                <ProjectCard project={project} key={project.slug} />
              ))}
            </div>
          ) : (
            <row.Feature key={row.key} />
          ),
        )}
      </div>
    </section>
  )
}
