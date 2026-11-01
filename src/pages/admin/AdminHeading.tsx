import { NavLink } from 'react-router-dom'
import { adminPath, adminSettingsPath } from '../../routes'
import './admin.css'
import './AdminHeading.css'

const adminPages = [
  { to: adminPath, label: 'Metrics' },
  { to: adminSettingsPath, label: 'Settings' },
]

/** The admin pages' title, signed-in owner, and links between the pages. */
export function AdminHeading({ email }: { email?: string }) {
  return (
    <div className="admin-heading">
      <h1 id="admin-title">Admin</h1>
      <nav className="admin-nav" aria-label="Admin pages">
        {adminPages.map((page) => (
          <NavLink key={page.to} className="admin-nav-link" to={page.to} end>
            {page.label}
          </NavLink>
        ))}
      </nav>
      {email ? <p className="admin-user">Signed in as {email}</p> : null}
    </div>
  )
}
