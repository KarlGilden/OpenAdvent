import { useCallback, useState } from 'react'
import { AdventCalendarGrid } from './components/advent-calendar-grid'
import { ADVENT_DAYS, type AdventDay } from './domain/advent'

export function App() {
  const [openedAdvents, setOpenedAdvents] = useState<readonly AdventDay[]>([])

  const openAdvent = useCallback((day: AdventDay) => {
    setOpenedAdvents((currentAdvents) =>
      currentAdvents.includes(day) ? currentAdvents : [...currentAdvents, day],
    )
  }, [])

  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="app-header__star" aria-hidden="true">
          ✦
        </span>
        <h1>OpenAdvent</h1>
        <p className="app-header__intro">
          Twenty-five little moments, waiting behind the doors.
        </p>
      </header>

      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={openedAdvents}
        onOpenAdvent={openAdvent}
      />
    </main>
  )
}

