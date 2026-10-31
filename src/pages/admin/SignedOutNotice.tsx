import { adminPath } from '../../routes'
import './admin.css'

/** Shown when a request found the Access session expired. A full navigation, because Access answers it with its own login page. */
export function SignedOutNotice() {
  return (
    <div className="admin-notice" role="alert">
      <p>You are signed out. Changes will not save until you sign in again.</p>
      <a className="admin-button" href={adminPath}>
        Sign in
      </a>
    </div>
  )
}
