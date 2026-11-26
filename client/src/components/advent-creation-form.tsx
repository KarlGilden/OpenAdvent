import { useState, type FormEvent } from 'react'
import { AdventApiError, createAdvent, type CalendarSummary } from '../services/advent-api'

const days = Array.from({ length: 25 }, (_, index) => index + 1)

export function AdventCreationForm({ getToken }: { getToken: () => Promise<string | null> }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<(CalendarSummary & { inviteUrl: string }) | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name')).trim()
    const year = Number(fields.get('year'))
    const contents = days.map((day) => String(fields.get(`day-${day}`)))
    if (!name) {
      setError('Enter an Advent name.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new AdventApiError('Log in again to create an Advent.')
      setCreated(await createAdvent(token, name, year, contents))
    } catch (error) {
      setError(error instanceof AdventApiError ? error.message : 'Could not create your Advent. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (created) {
    const inviteUrl = new URL(created.inviteUrl, window.location.origin).href
    return (
      <section className="advent-panel" aria-label="Share your Advent">
        <p role="status">Created {created.name} ({created.year}).</p>
        <label>
          Invitation link
          <input value={inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
        </label>
        {navigator.clipboard ? (
          <button className="account-controls__button" type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(inviteUrl)
              setCopied(true)
            } catch {
              setError('Select and copy the invitation link above.')
            }
          }}>
            Copy invitation link
          </button>
        ) : null}
        {copied ? <p role="status">Invitation link copied.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    )
  }

  return (
    <form className="advent-panel" onSubmit={submit}>
      <fieldset disabled={isSubmitting}>
        <legend>Advent details</legend>
        <div className="advent-fields">
          <label>
            Advent name
            <input name="name" required />
          </label>
          <label>
            Year
            <input name="year" type="number" min={1} max={9999} step={1} defaultValue={new Date().getFullYear()} required />
          </label>
        </div>
      </fieldset>
      <fieldset disabled={isSubmitting}>
        <legend>Door content</legend>
        <p>Write a surprise for each day or leave a door blank.</p>
        <div className="advent-day-fields">
          {days.map((day) => (
            <label key={day}>
              December {day}
              <textarea name={`day-${day}`} rows={2} />
            </label>
          ))}
        </div>
      </fieldset>
      <button className="account-controls__button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create Advent'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  )
}
