import { MoveUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import './NotFoundPage.css'

export function NotFoundPage() {
  return (
    <section className="not-found container">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>A loose connection.</h1>
      <p>That page isn't here. You can find my projects on the homepage.</p>
      <Link className="button button-dark" to="/">
        Back to the homepage <MoveUpRight size={17} />
      </Link>
    </section>
  )
}
