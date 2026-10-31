import { useEffect, useState } from 'react'
import { getSession } from './adminClient'

/** The signed-in owner's email, or undefined until the session answers. */
export function useSession(): string | undefined {
  const [email, setEmail] = useState<string>()
  useEffect(() => {
    let current = true
    getSession().then(
      (session) => {
        if (current) setEmail(session.email)
      },
      // A signed-out session shows the Sign in notice; any other failure leaves the line out.
      () => {},
    )
    return () => {
      current = false
    }
  }, [])
  return email
}
