import { Show, useAuth } from '@clerk/react'
import { useEffect, useRef, useState } from 'react'
import { useJoinCalendar } from '../api/mutations/useJoinCalendar'
import { useCalendars } from '../api/queries/useCalendars'
import type { JoinedCalendar } from '../api/types'
import { ApiError } from '../api/useFetch'
import { AccountControls } from './account-controls'
import { AdventCreationForm } from './advent-creation-form'
import { SharedAdventCalendar } from './shared-advent-calendar'

const pageTitles = {
  '/advent': 'My calendars',
  '/advent/new': 'Create an Advent',
  '/advent/join': 'Join an Advent',
}

type AdventPath = keyof typeof pageTitles

type AdventPageProps = { path: AdventPath; adventId?: never } | { path: '/advent/calendar'; adventId: string }

export function AdventPage(props: AdventPageProps) {
  return (
    <main className="app-shell advent-page">
      <header className="app-header">
        <a href="/">OpenAdvent</a>
        <h1>{props.path === '/advent/calendar' ? 'Advent calendar' : pageTitles[props.path]}</h1>
      </header>
      <AccountControls>
        <Show when="signed-out">
          <p className="advent-panel">
            {props.path === '/advent/join' ? 'Log in to accept this invitation.' : 'Log in to continue.'}
          </p>
        </Show>
        <Show when="signed-in">
          <SignedInPage {...props} />
        </Show>
      </AccountControls>
    </main>
  )
}

function SignedInPage({ path, adventId }: AdventPageProps) {
  const { sessionId } = useAuth()
  if (!sessionId) return null

  if (path === '/advent/calendar') {
    return <SharedAdventCalendar key={adventId} adventId={adventId} />
  }
  if (path === '/advent/new') return <AdventCreationForm />
  if (path === '/advent/join') return <AdventJoin />
  return <AdventList />
}

function AdventList() {
  const { data: calendars, isError } = useCalendars()

  if (isError && !calendars) return <p className="advent-panel" role="alert">Could not load your calendars. Refresh to try again.</p>
  if (!calendars) return <p className="advent-panel" role="status">Loading your calendars…</p>
  if (!calendars.length) return <p className="advent-panel">Calendars you create or join will appear here.</p>
  return (
    <ul className="advent-panel advent-list">
      {calendars.map(({ id, name, year }) => (
        <li key={id}><a href={`/advent/${encodeURIComponent(id)}`}>{name}</a><span>{year}</span></li>
      ))}
    </ul>
  )
}

function AdventJoin() {
  const invitation = window.location.hash.slice(1)
  const isValidInvitation = /^[A-Za-z0-9_-]{43}$/.test(invitation)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const { mutateAsync } = useJoinCalendar()
  const joinRequest = useRef<{ invitation: string; attempt: number; result: Promise<JoinedCalendar> } | null>(null)

  useEffect(() => {
    if (!isValidInvitation) return
    let active = true
    if (joinRequest.current?.invitation !== invitation || joinRequest.current.attempt !== attempt) {
      joinRequest.current = { invitation, attempt, result: mutateAsync(invitation) }
    }
    void joinRequest.current.result.then(
      ({ adventId }) => {
        if (active) window.location.replace(`/advent/${encodeURIComponent(adventId)}`)
      },
      (error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.code !== 'HTTP_ERROR') setError(error.message)
        else if (error instanceof ApiError && error.status === 404) setError('This invitation is unavailable.')
        else setError('Could not join this Advent.')
      },
    )
    return () => {
      active = false
    }
  }, [attempt, invitation, isValidInvitation, mutateAsync])

  if (!isValidInvitation) {
    return <p role="alert" className="advent-panel">Open a valid invitation link to join an Advent.</p>
  }
  return (
    <section className="advent-panel" aria-label="Invitation">
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button className="account-controls__button" type="button" onClick={() => {
            setError('')
            setAttempt((current) => current + 1)
          }}>
            Try again
          </button>
        </>
      ) : <p role="status">Joining calendar…</p>}
    </section>
  )
}
