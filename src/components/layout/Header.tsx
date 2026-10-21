import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { email, resumeUrl } from '../../content/site'
import { Feather } from '../Illustrations'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
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
        Let's talk <ArrowUpRight size={15} />
      </a>
    </header>
  )
}
