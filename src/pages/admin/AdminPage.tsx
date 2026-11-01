import { useSyncExternalStore } from 'react'
import { AdminHeading } from './AdminHeading'
import { isSignedOut, subscribeSignedOut } from './adminClient'
import { MetricsSection } from './MetricsSection'
import { SignedOutNotice } from './SignedOutNotice'
import { useDocumentTitle } from './useDocumentTitle'
import { useSession } from './useSession'
import { WritingSection } from './WritingSection'
import './admin.css'

export function AdminPage() {
  const email = useSession()
  const signedOut = useSyncExternalStore(subscribeSignedOut, isSignedOut)
  useDocumentTitle('Admin · Lionfeather')

  return (
    <section className="admin-page container" aria-labelledby="admin-title">
      <AdminHeading email={email} />
      {signedOut ? <SignedOutNotice /> : null}
      <MetricsSection />
      <WritingSection />
    </section>
  )
}
