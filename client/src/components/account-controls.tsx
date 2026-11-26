import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/react'
import { useEffect, useState } from 'react'
import { fetchCurrentUser, type CurrentUserProfile } from '../services/current-user-api'

function SignedInAccount() {
  const { getToken, sessionId } = useAuth()

  return (
    <>
      <UserButton />
      {sessionId ? <AccountProfile key={sessionId} getToken={getToken} /> : null}
    </>
  )
}

function AccountProfile({ getToken }: { getToken: () => Promise<string | null> }) {
  const [profile, setProfile] = useState<CurrentUserProfile | 'error' | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function loadProfile() {
      try {
        const token = await getToken()
        if (signal.aborted) return
        if (!token) throw new Error('Clerk session token unavailable')

        const currentUser = await fetchCurrentUser(token, signal)
        if (!signal.aborted) setProfile(currentUser)
      } catch {
        if (!signal.aborted) setProfile('error')
      }
    }

    void loadProfile()
    return () => controller.abort()
  }, [getToken])

  return (
    <div className="account-controls__profile" role="status">
      {profile === 'error' ? (
        'Could not load your profile.'
      ) : profile ? (
        <>
          <strong>{profile.name}</strong>
          <span>{profile.email}</span>
        </>
      ) : (
        'Loading your profile…'
      )}
    </div>
  )
}

export function AccountControls() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()

  if (!publishableKey) {
    return null
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <div className="account-controls">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="account-controls__button" type="button">
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="account-controls__button" type="button">
              Create account
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <SignedInAccount />
        </Show>
      </div>
    </ClerkProvider>
  )
}
