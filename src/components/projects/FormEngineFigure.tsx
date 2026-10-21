import { ArrowUpRight } from 'lucide-react'
import { FormEnginePreview } from './FormEnginePreview'

const formEngineUrl = 'https://www.formengine.com/'

export function FormEngineFigure() {
  return (
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
  )
}
