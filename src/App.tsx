import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Download,
  Mail,
  MoveUpRight,
} from 'lucide-react'
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { email, projects, resumeUrl } from './content'
import { Feather, VanIllustration } from './Illustrations'
import DashboardDemo from './DashboardDemo'
import DashboardScreenshot, { dashboardImageUrl } from './DashboardScreenshot'
import FormEnginePreview, { formEngineUrl } from './FormEnginePreview'
import FieldworkPreview, { FieldworkGallery } from './FieldworkPreview'
import {
  SignalDiscovery,
  TelemetryGallery,
  TelemetryPreview,
} from './TelemetryPreview'
import ThemeToggle from './ThemeToggle'

function PagePosition() {
  const { pathname, hash } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => {
    const project = projects.find((item) => pathname === `/work/${item.slug}`)
    document.title = project
      ? `${project.title} · Jacob Iwen`
      : 'Jacob Iwen · Lionfeather'
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
      else window.scrollTo(0, 0)
      if (previousPath.current !== pathname) {
        document.getElementById('main')?.focus({ preventScroll: true })
      }
      previousPath.current = pathname
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}

function Header() {
  return (
    <header className="site-header container">
      <Link
        to="/"
        className="wordmark"
        aria-label="Lionfeather, Jacob Iwen home"
      >
        <Feather />
        lionfeather<span className="wordmark-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link to="/#work">Work</Link>
        <Link to="/#about">About</Link>
        <a href={resumeUrl} target="_blank" rel="noreferrer">
          Resume <ArrowUpRight size={14} />
        </a>
      </nav>
      <ThemeToggle />
      <a className="header-contact" href={`mailto:${email}`}>
        Let’s talk <ArrowUpRight size={15} />
      </a>
    </header>
  )
}

function Contact() {
  const [copyStatus, setCopyStatus] = useState('')
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email)
      setCopyStatus('Email copied')
    } catch {
      setCopyStatus(
        'Select the email address to copy it, or use the email link.',
      )
    }
  }
  return (
    <section
      className="contact-section container"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <h2 id="contact-heading">Let’s talk shop.</h2>
      <a className="contact-email" href={`mailto:${email}`}>
        {email}
        <ArrowUpRight size={26} />
      </a>
      <p>Seeking my next software development role.</p>
      <div className="contact-actions">
        <button className="copy-button" onClick={copyEmail}>
          {copyStatus === 'Email copied' ? (
            <Check size={14} />
          ) : (
            <Copy size={14} />
          )}{' '}
          {copyStatus === 'Email copied' ? 'Copied' : 'Copy email'}
        </button>
        <span className="copy-status" role="status">
          {copyStatus}
        </span>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer container">
      <span>© {new Date().getFullYear()} Jacob Iwen</span>
      <a href="https://github.com/JakeIwen" target="_blank" rel="noreferrer">
        <Code2 size={14} /> GitHub <ArrowUpRight size={12} />
      </a>
    </footer>
  )
}

function Home() {
  return (
    <>
      <section className="hero container" aria-labelledby="intro-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="small-rule" /> SENIOR FULL STACK ENGINEER
          </p>
          <h1 id="intro-title">
            Jacob Iwen
            <br />
            <em>I build software.</em>
          </h1>
          <p className="hero-description">
            Web applications, integrations, and the infrastructure behind them.
            Eight years building and maintaining production systems, from the
            interface to the database.
          </p>
          <div className="hero-actions">
            <a className="button button-dark" href="#work">
              Explore my work <ArrowDown size={16} />
            </a>
            <a
              className="text-link"
              href={resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              View resume <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="hero-aside">
          <div className="availability">
            <span className="status-dot" /> OPEN TO OPPORTUNITIES
          </div>
          <VanIllustration />
          <p>
            Software engineer.
            <br />
            Mechanical engineer.
            <br />
            <span>Always building something.</span>
          </p>
        </div>
      </section>
      <div className="experience-strip container">
        <div className="stack-list">
          React <i /> TypeScript <i /> Node.js <i /> Ruby <i /> AWS <i />
          <span className="ai-python">
            AI <ArrowRight size={13} aria-hidden="true" /> Python & CAN
          </span>
        </div>
      </div>
      <section
        className="work-section container"
        id="work"
        aria-labelledby="work-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FEW THINGS I’VE BUILT</p>
            <h2 id="work-title">
              Selected <em>work.</em>
            </h2>
          </div>
        </div>
        <div className="project-grid">
          {projects.slice(0, 2).map((project) => (
            <Link
              className={`project-card ${project.slug}`}
              to={`/work/${project.slug}`}
              key={project.slug}
            >
              <div className="project-visual">
                {project.slug === 'van-dashboard' ? (
                  <DashboardScreenshot />
                ) : (
                  <FormEnginePreview />
                )}
              </div>
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
                <div className="tags">
                  {project.tags.slice(0, 3).join(' · ')}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link className="telemetry-feature" to="/work/van-telemetry">
          <div className="telemetry-feature-copy">
            <p className="eyebrow">AUTOMOTIVE SOFTWARE · 2026</p>
            <h3>Vehicle telemetry</h3>
            <p>
              Discovering CAN bus signals, validating their meaning, and
              bringing gauges, history, and warning evidence to a tablet web
              app.
            </p>
            <div className="tags">Python · SocketCAN · Preact · SQLite</div>
            <span className="telemetry-feature-link">
              View project <ArrowUpRight size={17} />
            </span>
          </div>
          <TelemetryPreview />
        </Link>
        <Link className="fieldwork-feature" to="/work/fieldwork">
          <div className="fieldwork-feature-image">
            <FieldworkPreview />
          </div>
          <div className="fieldwork-feature-copy">
            <p className="eyebrow">PERSONAL APPLICATION · 2026</p>
            <h3>Fieldwork</h3>
            <p>
              Company research, opportunities, and application history,
              connected in one local workspace.
            </p>
            <div className="tags">
              React · TypeScript · Node.js · SQLite · Codex
            </div>
            <span className="fieldwork-feature-link">
              View project <ArrowUpRight size={17} />
            </span>
          </div>
        </Link>
        <Link className="pipeline-project" to="/work/production-pipelines">
          <div className="pipeline-icon" aria-hidden="true">
            <span />
            <i />
            <span />
            <i />
            <span />
          </div>
          <div>
            <p className="eyebrow">DATA & INFRASTRUCTURE · 2018–2026</p>
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
      </section>
      <section
        className="about-section"
        id="about"
        aria-labelledby="about-title"
      >
        <div className="container about-grid">
          <div className="about-heading">
            <h2 id="about-title">About</h2>
          </div>
          <div className="about-copy">
            <p className="about-lead">
              I’m Jacob, a full-stack engineer with a mechanical engineering
              background and a home on wheels.
            </p>
            <p>
              From 2018 to 2026, I worked at Advantage Integrated Solutions,
              building a form-digitization product and maintaining client
              portals, data pipelines, and AWS infrastructure. On a small
              product team, my work spanned the application, its integrations,
              and the systems that kept it operating.
            </p>
            <p>
              Outside that work, I build the tools I use in my campervan: a
              browser dashboard, network and backup automation, and Python
              tooling for vehicle diagnostics. The mechanical and software sides
              of my background coalesce often.
            </p>
            <div className="about-links">
              <a className="text-link" href={resumeUrl} download>
                <Download size={15} /> Download resume
              </a>
              <a
                className="text-link"
                href="https://github.com/JakeIwen"
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
      <Contact />
    </>
  )
}

// Renders content.ts intro text: blank lines split paragraphs, **text** is bold.
function Intro({ text }: { text: string }) {
  return text
    .split(/\n\n+/)
    .map((paragraph) => (
      <p key={paragraph.slice(0, 45)}>
        {paragraph
          .split(/(\*\*[^*]+\*\*)/)
          .map((part, index) =>
            part.startsWith('**') ? (
              <strong key={index}>{part.slice(2, -2)}</strong>
            ) : (
              part
            ),
          )}
      </p>
    ))
}

function ProjectPage() {
  const { slug } = useParams()
  const project = projects.find((item) => item.slug === slug)
  if (!project) return <NotFound />
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
      {project.slug === 'van-dashboard' && (
        <figure className="case-screenshot">
          <a
            className="screenshot-link"
            href={dashboardImageUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open full-size Van dashboard screenshot in a new tab"
          >
            <DashboardScreenshot loading="eager" />
          </a>
          <figcaption>
            <span>Van dashboard</span>
            <a href={dashboardImageUrl} target="_blank" rel="noreferrer">
              View full size <ArrowUpRight size={13} />
            </a>
          </figcaption>
        </figure>
      )}
      {project.slug === 'form-engine' && (
        <figure className="case-screenshot form-engine-preview">
          <a
            className="screenshot-link"
            href={formEngineUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Form Engine in a new tab"
          >
            <FormEnginePreview loading="eager" />
          </a>
          <figcaption>
            <span>Form Engine · Advantage Integrated Solutions</span>
            <a href={formEngineUrl} target="_blank" rel="noreferrer">
              Visit Form Engine <ArrowUpRight size={13} />
            </a>
          </figcaption>
        </figure>
      )}
      {project.slug === 'fieldwork' && <FieldworkGallery />}
      {project.slug === 'van-telemetry' && (
        <>
          <TelemetryGallery />
          <SignalDiscovery />
        </>
      )}
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
      {project.slug === 'van-dashboard' && <DashboardDemo />}
      <div className="case-end">
        <p>Contact</p>
        <a className="text-link" href={`mailto:${email}`}>
          <Mail size={16} /> {email} <ArrowUpRight size={14} />
        </a>
      </div>
      <Link className="next-project" to={`/work/${next.slug}`}>
        <div>
          <p className="eyebrow">NEXT PROJECT</p>
          <h2>{next.title}</h2>
        </div>
        <ArrowRight size={28} />
      </Link>
    </article>
  )
}

function NotFound() {
  return (
    <section className="not-found container">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>A loose connection.</h1>
      <p>That page isn’t here. You can find my projects on the homepage.</p>
      <Link className="button button-dark" to="/">
        Back to the homepage <MoveUpRight size={17} />
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <PagePosition />
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
