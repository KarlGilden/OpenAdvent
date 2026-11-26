import { Show, useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { AccountControls } from './account-controls'
import { AdventCreationForm } from './advent-creation-form'
import { SharedAdventCalendar } from './shared-advent-calendar'
import { AdventApiError, joinAdvent, listAdvents, type CalendarSummary } from '../services/advent-api'

const pageTitles = {
  '/advent': 'My calendars',
  '/advent/new': 'Create an Advent',
  '/advent/join': 'Join an Advent',
}

type AdventPath = keyof typeof pageTitles
type GetToken = () => Promise<string | null>

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
          <p className="advent-panel">Log in to continue.</p>
        </Show>
        <Show when="signed-in">
          <SignedInPage {...props} />
        </Show>
      </AccountControls>
    </main>
  )
}

function SignedInPage({ path, adventId }: AdventPageProps) {
  const { getToken, sessionId } = useAuth()
  if (!sessionId) return null

  if (path === '/advent/calendar') {
    return <SharedAdventCalendar key={`${sessionId}/${adventId}`} adventId={adventId} getToken={getToken} />
  }
  if (path === '/advent/new') return <AdventCreationForm key={sessionId} getToken={getToken} />
  if (path === '/advent/join') return <AdventJoin key={sessionId} getToken={getToken} />
  return <AdventList key={sessionId} getToken={getToken} />
}

function AdventList({ getToken }: { getToken: GetToken }) {
  const [calendars, setCalendars] = useState<CalendarSummary[] | 'error' | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      try {
        const token = await getToken()
        if (signal.aborted) return
        if (!token) throw new Error('Session unavailable')
        const result = await listAdvents(token, signal)
        if (!signal.aborted) setCalendars(result)
      } catch {
        if (!signal.aborted) setCalendars('error')
      }
    }
    void load()
    return () => controller.abort()
  }, [getToken])

  if (calendars === 'error') return <p className="advent-panel" role="alert">Could not load your calendars. Refresh to try again.</p>
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

function AdventJoin({ getToken }: { getToken: GetToken }) {
  const invitation = window.location.hash.slice(1)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  async function join() {
    if (isJoining) return
    setIsJoining(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new AdventApiError('Log in again to join this Advent.')
      await joinAdvent(token, invitation)
      window.location.replace('/advent')
    } catch (error) {
      setError(error instanceof AdventApiError ? error.message : 'Could not join this Advent. Try again.')
      setIsJoining(false)
    }
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(invitation)) {
    return <p role="alert" className="advent-panel">Open a valid invitation link to join an Advent.</p>
  }
  return (
    <section className="advent-panel" aria-label="Invitation">
      <button className="account-controls__button" type="button" onClick={join} disabled={isJoining}>
        {isJoining ? 'Joining…' : 'Join calendar'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  )
}
