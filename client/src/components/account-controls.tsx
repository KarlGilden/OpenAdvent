import {
  ClerkProvider,
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
} from '@clerk/react'
import type { ReactNode } from 'react'
import { useCurrentUser } from '../api/queries/useCurrentUser'
import { SessionQueryProvider } from '../providers/SessionQueryProvider'

function SignedInAccount() {
  return (
    <>
      <UserButton />
      <AccountProfile />
      <a className="account-controls__button" href="/advent">My calendars</a>
      <a className="account-controls__button" href="/advent/new">Create an Advent</a>
      <SignOutButton redirectUrl="/">
        <button className="account-controls__button" type="button">Sign out</button>
      </SignOutButton>
    </>
  )
}

function AccountProfile() {
  const { data: profile, isError } = useCurrentUser()

  return (
    <div className="account-controls__profile" role="status">
      {isError ? (
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
      <SessionQueryProvider>
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
      </SessionQueryProvider>
    </ClerkProvider>
  )
}
