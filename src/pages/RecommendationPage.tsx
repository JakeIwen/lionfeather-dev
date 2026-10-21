import { ArrowLeft, ArrowUpRight, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BoldText } from '../components/BoldText'
import { recommendation } from '../content/recommendation'
import { email } from '../content/site'
import './case-study.css'
import './RecommendationPage.css'

export function RecommendationPage() {
  const { author, title, company, date, salutation, letter, closing } =
    recommendation
  return (
    <article className="project-page letter-page container">
      <Link className="back-link" to="/#recommendation">
        <ArrowLeft size={15} /> Home
      </Link>
      <div className="case-heading">
        <p className="eyebrow">
          {author.toUpperCase()} <span> / {date.toUpperCase()}</span>
        </p>
        <h1>Letter of recommendation</h1>
      </div>
      <div className="letter-body">
        <p>
          <strong>{salutation}</strong>
        </p>
        {letter.split(/\n\n+/).map((block) =>
          block.startsWith('- ') ? (
            <ul key={block.slice(0, 45)}>
              {block.split('\n').map((line) => (
                <li key={line.slice(0, 45)}>
                  <BoldText text={line.slice(2)} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={block.slice(0, 45)}>
              <BoldText text={block} />
            </p>
          ),
        )}
        <p>{closing}</p>
        <p className="letter-signature">
          <strong>{author}</strong>
          <br />
          {title}
          <br />
          {company}
        </p>
      </div>
      <div className="case-end">
        <p>Henry's contact details are available on request.</p>
        <a className="text-link" href={`mailto:${email}`}>
          <Mail size={16} /> {email} <ArrowUpRight size={14} />
        </a>
      </div>
    </article>
  )
}
