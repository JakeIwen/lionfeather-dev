import { ArrowLeft, ArrowUpRight, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { email, recommendation, recommendationPath } from './content'
import BoldText from './RichText'

export function RecommendationSection() {
  return (
    <section
      className="recommendation-section container"
      id="recommendation"
      aria-labelledby="recommendation-title"
    >
      <h2 id="recommendation-title">Recommendation</h2>
      <div>
        <figure className="recommendation-quote">
          <blockquote>
            <p className="recommendation-lead">“{recommendation.quote}”</p>
            <p>“{recommendation.excerpt}”</p>
          </blockquote>
          <figcaption>
            {recommendation.author}
            <small>
              {recommendation.title}, {recommendation.company}
            </small>
          </figcaption>
        </figure>
        <Link className="text-link recommendation-link" to={recommendationPath}>
          Read the full letter <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  )
}

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
