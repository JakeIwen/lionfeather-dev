import { ArrowLeft, ArrowRight, ArrowUpRight, Mail } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BoldText } from '../components/BoldText'
import { caseStudyMedia } from '../components/projects/projectMedia'
import { projects, type Project } from '../content/projects'
import { email } from '../content/site'
import { projectPath } from '../routes'
import { NotFoundPage } from './NotFoundPage'

// Renders a project's intro text: blank lines split paragraphs, **text** is bold.
function Intro({ text }: { text: string }) {
  return text.split(/\n\n+/).map((paragraph) => (
    <p key={paragraph.slice(0, 45)}>
      <BoldText text={paragraph} />
    </p>
  ))
}

function CaseSections({ project }: { project: Project }) {
  return (
    <div className="case-body">
      {project.sections.map((section, index) => (
        <section className="case-section" key={section.title}>
          <span className="case-section-index">0{index + 1}</span>
          <div>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 45)}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function CaseEnd() {
  return (
    <div className="case-end">
      <p>Contact</p>
      <a className="text-link" href={`mailto:${email}`}>
        <Mail size={16} /> {email} <ArrowUpRight size={14} />
      </a>
    </div>
  )
}

function NextProject({ project }: { project: Project }) {
  return (
    <Link className="next-project" to={projectPath(project.slug)}>
      <div>
        <p className="eyebrow">NEXT PROJECT</p>
        <h2>{project.title}</h2>
      </div>
      <ArrowRight size={28} />
    </Link>
  )
}

export function ProjectPage() {
  const { slug } = useParams()
  const project = projects.find((item) => item.slug === slug)
  if (!project) return <NotFoundPage />
  const next = projects[(projects.indexOf(project) + 1) % projects.length]!
  return (
    <article className="project-page container">
      <Link className="back-link" to="/#work">
        <ArrowLeft size={15} /> All work
      </Link>
      <div className="case-heading">
        <p className="eyebrow">
          {project.category} <span> / {project.period}</span>
        </p>
        <h1>{project.title}</h1>
        <Intro text={project.intro} />
      </div>
      <div className="case-meta">
        <div>
          <span>MY ROLE</span>
          <p>{project.role}</p>
        </div>
        <div>
          <span>TOOLS & TECHNOLOGIES</span>
          <p>{project.tags.join(' · ')}</p>
        </div>
      </div>
      {caseStudyMedia[project.slug]}
      <CaseSections project={project} />
      <CaseEnd />
      <NextProject project={next} />
    </article>
  )
}
