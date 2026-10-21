import { ArrowUpRight, Code2 } from 'lucide-react'
import { githubUrl } from '../../content/site'
import './Footer.css'

export function Footer() {
  return (
    <footer className="site-footer container">
      <span>© {new Date().getFullYear()} Jacob Iwen</span>
      <a href={githubUrl} target="_blank" rel="noreferrer">
        <Code2 size={14} /> GitHub <ArrowUpRight size={12} />
      </a>
    </footer>
  )
}
