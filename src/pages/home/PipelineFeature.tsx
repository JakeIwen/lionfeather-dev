import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { projectPath } from '../../routes'
import './project-metadata.css'
import './PipelineFeature.css'

export function PipelineFeature() {
  return (
    <Link className="pipeline-project" to={projectPath('production-pipelines')}>
      <div className="pipeline-icon" aria-hidden="true">
        <span />
        <i />
        <span />
        <i />
        <span />
      </div>
      <div>
        <p className="eyebrow">DATA & INFRASTRUCTURE · 2018-2026</p>
        <h3>Workforce integration platform</h3>
        <p>
          More than 50 scheduled SFTP and spreadsheet jobs between workforce
          applications and state and county agencies.
        </p>
      </div>
      <span className="pipeline-tech">Ruby · AWS · SFTP</span>
      <span className="project-arrow">
        <ArrowUpRight size={24} />
      </span>
    </Link>
  )
}
