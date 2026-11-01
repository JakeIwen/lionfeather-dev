import { useSyncExternalStore } from 'react'
import { AdminHeading } from './AdminHeading'
import { AppearanceSection } from './AppearanceSection'
import { isSignedOut, subscribeSignedOut } from './adminClient'
import { LayoutSection } from './LayoutSection'
import { ReviewSection } from './ReviewSection'
import { SignedOutNotice } from './SignedOutNotice'
import { useDocumentTitle } from './useDocumentTitle'
import { useSession } from './useSession'
import './admin.css'

/** The owner's settings: article review model, homepage layout, and theme. */
export function AdminSettingsPage() {
  const email = useSession()
  const signedOut = useSyncExternalStore(subscribeSignedOut, isSignedOut)
  useDocumentTitle('Settings · Lionfeather')

  return (
    <section className="admin-page container" aria-labelledby="admin-title">
      <AdminHeading email={email} />
      {signedOut ? <SignedOutNotice /> : null}
      <ReviewSection />
      <AppearanceSection />
      <LayoutSection />
    </section>
  )
}
