import { useMemo } from 'react'
import type { AdventDay } from '../domain/advent'
import { SimpleAdventDoor } from './simple-advent-door'

interface AdventCalendarGridProps {
  readonly days: readonly AdventDay[]
  readonly openedAdvents: readonly AdventDay[]
  readonly onOpenAdvent: (day: AdventDay) => void
}

export function AdventCalendarGrid({
  days,
  openedAdvents,
  onOpenAdvent,
}: AdventCalendarGridProps) {
  const openedAdventSet = useMemo(
    () => new Set(openedAdvents),
    [openedAdvents],
  )

  return (
    <section className="calendar" aria-labelledby="calendar-title">
      <div className="calendar__heading">
        <h2 id="calendar-title">Your December doors</h2>
        <p>
          Choose a number to mark the moment. Opened doors wear a golden seal.
        </p>
      </div>

      <ol className="calendar__grid" aria-label="Advent calendar days">
        {days.map((day) => (
          <li className="calendar__day" key={day}>
            <SimpleAdventDoor
              day={day}
              isOpened={openedAdventSet.has(day)}
              onOpen={onOpenAdvent}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
