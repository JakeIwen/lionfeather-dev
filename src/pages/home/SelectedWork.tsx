import { projects } from '../../content/projects'
import { FieldworkFeature } from './FieldworkFeature'
import { PipelineFeature } from './PipelineFeature'
import { ProjectCard } from './ProjectCard'
import { TelemetryFeature } from './TelemetryFeature'
import { WritingFeature } from './WritingFeature'
import './SelectedWork.css'

export function SelectedWork() {
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
      <div className="project-grid">
        {projects.slice(0, 2).map((project) => (
          <ProjectCard project={project} key={project.slug} />
        ))}
      </div>
      <PipelineFeature />
      <TelemetryFeature />
      <FieldworkFeature />
      <WritingFeature />
    </section>
  )
}
