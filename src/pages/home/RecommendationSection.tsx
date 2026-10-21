import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { recommendation } from '../../content/recommendation'
import { recommendationPath } from '../../routes'

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
