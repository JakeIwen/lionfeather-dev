import { ArrowUpRight, Settings } from 'lucide-react'
import { useOwnerBrowser } from '../../articleEdits/ownerBrowser'
import { Link } from 'react-router-dom'
import { email, resumeUrl } from '../../content/site'
import { adminSettingsPath, writingPath } from '../../routes'
import { useSiteSettings } from '../../settings/currentSiteSettings'
import { showsSelectedWork, visibleIds } from '../../settings/siteSettings'
import { Feather } from './Feather'
import { ThemeToggle } from './ThemeToggle'
import './ThemeToggle.css'
import './Header.css'

export function Header() {
  // Section links appear only while the owner shows those sections.
  const settings = useSiteSettings()
  const showsWork = showsSelectedWork(settings)
  const showsAbout = visibleIds(settings.homeSections).includes('about')
  const owner = useOwnerBrowser()
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
        {showsWork && <Link to="/#work">Work</Link>}
        {showsAbout && <Link to="/#about">About</Link>}
        <Link to={writingPath}>Writing</Link>
        <a href={resumeUrl} target="_blank" rel="noreferrer">
          Resume <ArrowUpRight size={14} />
        </a>
        {owner && (
          <Link
            className="header-settings"
            to={adminSettingsPath}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} aria-hidden="true" />
          </Link>
        )}
      </nav>
      <ThemeToggle className="header-appearance" />
      <a className="header-contact" href={`mailto:${email}`}>
        Let's talk <ArrowUpRight size={15} />
      </a>
    </header>
  )
}
