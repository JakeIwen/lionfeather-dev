import { useEffect, useSyncExternalStore } from 'react'
import { AppearanceSection } from './AppearanceSection'
import { isSignedOut, subscribeSignedOut } from './adminClient'
import { LayoutSection } from './LayoutSection'
import { MetricsSection } from './MetricsSection'
import { SignedOutNotice } from './SignedOutNotice'
import { useSession } from './useSession'
import { WritingSection } from './WritingSection'
import './admin.css'

const adminTitle = 'Admin · Lionfeather'

export function AdminPage() {
  const email = useSession()
  const signedOut = useSyncExternalStore(subscribeSignedOut, isSignedOut)

  useEffect(() => {
    const previous = document.title
    document.title = adminTitle
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <section className="admin-page container" aria-labelledby="admin-title">
      <div className="admin-heading">
        <h1 id="admin-title">Admin</h1>
        {email ? <p className="admin-user">Signed in as {email}</p> : null}
      </div>
      {signedOut ? <SignedOutNotice /> : null}
      <MetricsSection />
      <LayoutSection />
      <WritingSection />
      <AppearanceSection />
    </section>
  )
}
