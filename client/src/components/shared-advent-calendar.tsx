import { useRef, useState } from 'react'
import { useOpenDoor } from '../api/mutations/useOpenDoor'
import { useCalendar } from '../api/queries/useCalendar'
import type { CalendarView } from '../api/types'
import { ApiError } from '../api/useFetch'
import { ADVENT_DAYS, type AdventDay } from '../domain/advent'
import { AdventCalendarGrid, type AdventContent } from './advent-calendar-grid'

interface SharedAdventProps {
  adventId: string
}

export function SharedAdventCalendar({ adventId }: SharedAdventProps) {
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const { data: view, error } = useCalendar(adventId, timeZone)

  if (!view && error) {
    const message = error instanceof ApiError ? error.message : 'Could not load this calendar. Refresh to try again.'
    return <p className="advent-panel" role="alert">{message}</p>
  }
  if (!view) return <p className="advent-panel" role="status">Loading your calendar…</p>

  return <SharedAdventDoors calendar={view} timeZone={timeZone} />
}

function SharedAdventDoors({ calendar, timeZone }: {
  calendar: CalendarView
  timeZone: string
}) {
  const [revealed, setRevealed] = useState<AdventContent>({})
  const [unsaved, setUnsaved] = useState<AdventDay[]>([])
  const pending = useRef(new Set<AdventDay>())
  const accepted = useRef(new Set<AdventDay>())
  const { mutateAsync: saveDoor } = useOpenDoor(calendar.id, timeZone)
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
    if (door.openedAt || accepted.current.has(day) || pending.current.has(day)) return

    pending.current.add(day)
    try {
      await saveDoor(day)
      accepted.current.add(day)
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
