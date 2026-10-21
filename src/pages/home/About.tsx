import { ArrowUpRight, Download } from 'lucide-react'
import { githubUrl, resumeUrl } from '../../content/site'
import './About.css'

export function About() {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <div className="container about-grid">
        <div className="about-heading">
          <h2 id="about-title">About</h2>
        </div>
        <div className="about-copy">
          <p className="about-lead">
            I'm Jacob, a full-stack engineer with a mechanical engineering
            background and a home on wheels.
          </p>
          <p>
            From 2018 to 2026, I worked on a small product team at Advantage
            Integrated Solutions, building a form-digitization product and
            maintaining client portals, data pipelines, and AWS infrastructure.
          </p>
          <p>
            Outside that work, I build the tools I use in my campervan: a
            browser dashboard, network and backup automation, and Python tooling
            for vehicle diagnostics. That is where the mechanical and software
            sides of my background meet.
          </p>
          <div className="about-links">
            <a className="text-link" href={resumeUrl} download>
              <Download size={15} /> Download resume
            </a>
            <a
              className="text-link"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              Find me on GitHub <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="education">
          <span>
            B.S. Mechanical Engineering{' '}
            <small>University of Minnesota · 2012</small>
          </span>
          <span>
            Full Stack Software Engineering{' '}
            <small>PRIME Digital Academy · 2017</small>
          </span>
        </div>
      </div>
    </section>
  )
}
