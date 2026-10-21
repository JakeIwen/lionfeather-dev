import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { projectCardMedia } from '../../components/projects/projectMedia'
import type { Project } from '../../content/projects'
import { projectPath } from '../../routes'
import './project-metadata.css'
import './ProjectCard.css'

type ProjectCardProps = {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      className={`project-card ${project.slug}`}
      to={projectPath(project.slug)}
    >
      <div className="project-visual">{projectCardMedia[project.slug]}</div>
      <div className="project-details">
        <div className="project-meta">
          <span>{project.category}</span>
          <span>{project.period}</span>
        </div>
        <div className="project-title-row">
          <h3>{project.title}</h3>
          <span className="project-arrow">
            <ArrowUpRight size={24} />
          </span>
        </div>
        <p>{project.subtitle}</p>
        <div className="tags">{project.tags.slice(0, 3).join(' · ')}</div>
      </div>
    </Link>
  )
}
