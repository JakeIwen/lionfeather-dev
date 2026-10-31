import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { resumeUrl } from '../../content/site'
import { useSiteSettings } from '../../settings/currentSiteSettings'
import { showsSelectedWork } from '../../settings/siteSettings'
import { VanIllustration } from './VanIllustration'
import './VanIllustration.css'
import './Hero.css'

export function Hero() {
  const showsWork = showsSelectedWork(useSiteSettings())
  return (
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
          {showsWork && (
            <a className="button button-dark" href="#work">
              Explore my work <ArrowDown size={16} />
            </a>
          )}
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
        <VanIllustration className="hero-van" />
        <p>
          Software engineer.
          <br />
          Mechanical engineer.
          <br />
          <span>Always building something.</span>
        </p>
      </div>
    </section>
  )
}
