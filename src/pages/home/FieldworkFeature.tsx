import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FieldworkPreview } from '../../components/projects/FieldworkPreview'
import { projectPath } from '../../routes'

export function FieldworkFeature() {
  return (
    <Link className="fieldwork-feature" to={projectPath('fieldwork')}>
      <div className="fieldwork-feature-image">
        <FieldworkPreview />
      </div>
      <div className="fieldwork-feature-copy">
        <p className="eyebrow">PERSONAL APPLICATION · 2026</p>
        <h3>Fieldwork</h3>
        <p>
          Company research, opportunities, and application history, connected in
          one local workspace.
        </p>
        <div className="tags">
          React · TypeScript · Node.js · SQLite · Codex
        </div>
        <span className="fieldwork-feature-link">
          View project <ArrowUpRight size={17} />
        </span>
      </div>
    </Link>
  )
}
