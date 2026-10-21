import { useState } from 'react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { email } from '../../content/site'

export function Contact() {
  const [copyStatus, setCopyStatus] = useState('')
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email)
      setCopyStatus('Email copied')
    } catch {
      setCopyStatus(
        'Select the email address to copy it, or use the email link.',
      )
    }
  }
  return (
    <section
      className="contact-section container"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <h2 id="contact-heading">Let's talk shop.</h2>
      <a className="contact-email" href={`mailto:${email}`}>
        {email}
        <ArrowUpRight size={26} />
      </a>
      <p>Seeking my next software development role.</p>
      <div className="contact-actions">
        <button className="copy-button" onClick={copyEmail}>
          {copyStatus === 'Email copied' ? (
            <Check size={14} />
          ) : (
            <Copy size={14} />
          )}{' '}
          {copyStatus === 'Email copied' ? 'Copied' : 'Copy email'}
        </button>
        <span className="copy-status" role="status">
          {copyStatus}
        </span>
      </div>
    </section>
  )
}
