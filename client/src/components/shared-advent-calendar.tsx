import { useEffect, useRef, useState } from 'react'
import { ADVENT_DAYS, type AdventDay } from '../domain/advent'
import { AdventApiError, getAdvent, saveOpenedDoor, type CalendarView } from '../services/advent-api'
import { AdventCalendarGrid, type AdventContent } from './advent-calendar-grid'

interface SharedAdventProps {
  adventId: string
  getToken: () => Promise<string | null>
}

export function SharedAdventCalendar({ adventId, getToken }: SharedAdventProps) {
  const [view, setView] = useState<CalendarView | string | null>(null)
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      try {
        const token = await getToken()
        if (signal.aborted) return
        if (!token) throw new AdventApiError('Log in again to view this calendar.')
        const calendar = await getAdvent(token, adventId, timeZone, signal)
        if (!signal.aborted) setView(calendar)
      } catch (error) {
        if (!signal.aborted) {
          setView(error instanceof AdventApiError ? error.message : 'Could not load this calendar. Refresh to try again.')
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [adventId, getToken, timeZone])

  if (typeof view === 'string') return <p className="advent-panel" role="alert">{view}</p>
  if (!view) return <p className="advent-panel" role="status">Loading your calendar…</p>

  return <SharedAdventDoors calendar={view} getToken={getToken} timeZone={timeZone} />
}

function SharedAdventDoors({ calendar, getToken, timeZone }: {
  calendar: CalendarView
  getToken: SharedAdventProps['getToken']
  timeZone: string
}) {
  const [revealed, setRevealed] = useState<AdventContent>({})
  const [unsaved, setUnsaved] = useState<AdventDay[]>([])
  const pending = useRef(new Set<AdventDay>())
  const saved = useRef(new Set(calendar.days.filter(({ openedAt }) => openedAt !== null).map(({ day }) => day)))
  const available = new Map(calendar.days.map((door) => [door.day, door]))
  const openedAdvents = ADVENT_DAYS.filter((day) => available.get(day)?.openedAt || revealed[day] !== undefined)

  function isDoorLocked(day: AdventDay) {
    const today = new Date()
    const year = today.getFullYear()
    return !available.has(day) || year < calendar.year
      || (year === calendar.year && (today.getMonth() !== 11 || day > today.getDate()))
  }

  async function openDoor(day: AdventDay) {
    const door = available.get(day)
    if (!door || isDoorLocked(day)) return

    setRevealed((current) => ({ ...current, [day]: door.content || 'This door is empty.' }))
    if (saved.current.has(day) || pending.current.has(day)) return

    pending.current.add(day)
    try {
      const token = await getToken()
      if (!token) throw new Error('Session unavailable')
      await saveOpenedDoor(token, calendar.id, day, timeZone)
      saved.current.add(day)
      setUnsaved((current) => current.filter((failedDay) => failedDay !== day))
    } catch {
      setUnsaved((current) => current.includes(day) ? current : [...current, day])
    } finally {
      pending.current.delete(day)
    }
  }

  return (
    <>
      <h2 className="shared-advent-title">{calendar.name} <span>{calendar.year}</span></h2>
      {unsaved.length ? (
        <p className="app-notice" role="alert">
          Could not save progress for {unsaved.length === 1 ? 'day' : 'days'} {unsaved.join(', ')}. Select the door again to retry.
        </p>
      ) : null}
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={openedAdvents}
        revealedContent={revealed}
        isDoorLocked={isDoorLocked}
        onOpenAdvent={openDoor}
      />
    </>
  )
}
