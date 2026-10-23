import { ArrowUpRight } from 'lucide-react'
import { additionalWork } from '../../content/additionalWork'
import './SelectedWork.css'
import './AdditionalWork.css'

export function AdditionalWork() {
  return (
    <section
      className="additional-work-section container"
      id="additional-work"
      aria-labelledby="additional-work-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">MORE THINGS I'VE BUILT</p>
          <h2 id="additional-work-title">
            Additional <em>work.</em>
          </h2>
        </div>
      </div>
      <ul className="additional-work-list">
        {additionalWork.map((item) => (
          <li key={item.title} className="additional-work-item">
            <h3 className="additional-work-title">
              {item.href ? (
                <a
                  className="text-link additional-work-link"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title} <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ) : (
                item.title
              )}
            </h3>
            <p>{item.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
