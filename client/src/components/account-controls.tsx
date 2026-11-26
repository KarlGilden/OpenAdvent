import {
  ClerkProvider,
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/react'
import { useEffect, useState, type ReactNode } from 'react'
import { fetchCurrentUser, type CurrentUserProfile } from '../services/current-user-api'

function SignedInAccount() {
  const { getToken, sessionId } = useAuth()

  return (
    <>
      <UserButton />
      {sessionId ? <AccountProfile key={sessionId} getToken={getToken} /> : null}
      <a className="account-controls__button" href="/advent">My calendars</a>
      <a className="account-controls__button" href="/advent/new">Create an Advent</a>
      <SignOutButton redirectUrl="/">
        <button className="account-controls__button" type="button">Sign out</button>
      </SignOutButton>
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

export function AccountControls({ children }: { children?: ReactNode } = {}) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()

  if (!publishableKey) {
    return children ? <p>Sign-in is unavailable.</p> : null
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
      {children}
    </ClerkProvider>
  )
}
