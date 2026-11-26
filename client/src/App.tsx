import { useMemo, useState, type ChangeEvent } from 'react'
import { AccountControls } from './components/account-controls'
import { AdventCalendarGrid } from './components/advent-calendar-grid'
import {
  CALENDARS,
  DEFAULT_CALENDAR_TYPE,
  findCalendar,
  isCalendarType,
  type CalendarType,
} from './content/calendar-registry'
import { useCalendarController } from './controllers/use-calendar-controller'
import { LocalStorageOpenedAdventStore } from './services/local-storage-opened-advent-store'
import type { OpenedAdventStore } from './services/interfaces/advent-store'
import type { AdventService } from './services/interfaces/advent-service'

function createDefaultOpenedAdventStore(
  calendarType: CalendarType,
): OpenedAdventStore {
  try {
    return new LocalStorageOpenedAdventStore(
      globalThis.localStorage,
      calendarType,
    )
  } catch (storageError) {
    return {
      async loadOpenedAdvents() {
        throw storageError
      },
      async markAdventOpened() {
        throw storageError
      },
    }
  }
}

export interface AppProps {
  readonly adventService?: AdventService
  readonly openedAdventStore?: OpenedAdventStore
  readonly today?: Date
}

interface CalendarExperienceProps {
  readonly adventService: AdventService
  readonly openedAdventStore: OpenedAdventStore
  readonly today: Date
}

function CalendarExperience({
  adventService,
  openedAdventStore,
  today,
}: CalendarExperienceProps) {
  const calendar = useCalendarController(adventService, openedAdventStore)

  return (
    <>
      {calendar.isInitializing ? (
        <section
          className="calendar calendar--loading"
          id="calendar"
          aria-labelledby="calendar-loading-title"
          aria-live="polite"
        >
          <span className="calendar-loading__star" aria-hidden="true">
            ✦
          </span>
          <h2 id="calendar-loading-title">Preparing Your Calendar…</h2>
          <p>Gathering the doors you have already opened.</p>
        </section>
      ) : (
        <>
          {calendar.initializationError ? (
            <aside
              className="app-notice"
              role="alert"
              aria-labelledby="restore-error-title"
            >
              <h2 id="restore-error-title">Progress Couldn’t Be Restored</h2>
              <p>
                You can still open every door. Check this browser’s storage
                settings and refresh to restore saved progress.
              </p>
            </aside>
          ) : null}

          {calendar.persistenceError ? (
            <aside
              className="app-notice"
              role="status"
              aria-labelledby="save-error-title"
            >
              <h2 id="save-error-title">Door Opened, Progress Not Saved</h2>
              <p>
                The surprise is ready, but this browser may forget the door
                after a refresh. Check its storage settings before continuing.
              </p>
            </aside>
          ) : null}

          <AdventCalendarGrid
            days={calendar.days}
            openedAdvents={calendar.openedAdvents}
            loadingAdvents={calendar.loadingAdvents}
            revealedContent={calendar.revealedContent}
            errors={calendar.adventErrors}
            today={today}
            onOpenAdvent={calendar.openAdvent}
          />
        </>
      )}
    </>
  )
}

export function App({
  adventService,
  openedAdventStore,
  today = new Date(),
}: AppProps = {}) {
  const [selectedCalendarType, setSelectedCalendarType] =
    useState<CalendarType>(DEFAULT_CALENDAR_TYPE)
  const selectedCalendar = findCalendar(selectedCalendarType)
  const selectedStore = useMemo(
    () =>
      openedAdventStore ??
      createDefaultOpenedAdventStore(selectedCalendarType),
    [openedAdventStore, selectedCalendarType],
  )

  function selectCalendar(event: ChangeEvent<HTMLSelectElement>) {
    const nextCalendarType = event.currentTarget.value

    if (isCalendarType(nextCalendarType)) {
      setSelectedCalendarType(nextCalendarType)
    }
  }

  return (
    <main className="app-shell">
      <a className="skip-link" href="#calendar">
        Skip to Calendar
      </a>

      <header className="app-header">
        <span className="app-header__star" aria-hidden="true">
          ✦
        </span>
        <h1 translate="no">OpenAdvent</h1>
        <p className="app-header__intro">
          Twenty-five little moments, waiting behind the doors.
        </p>
        <AccountControls />
      </header>

      <div className="calendar-picker">
        <label htmlFor="calendar-type">Choose your calendar</label>
        <span className="calendar-picker__control">
          <select
            id="calendar-type"
            value={selectedCalendarType}
            onChange={selectCalendar}
          >
            {CALENDARS.map((calendar) => (
              <option key={calendar.type} value={calendar.type}>
                {calendar.name}
              </option>
            ))}
          </select>
          <span aria-hidden="true">⌄</span>
        </span>
      </div>

      <CalendarExperience
        key={selectedCalendarType}
        adventService={adventService ?? selectedCalendar.service}
        openedAdventStore={selectedStore}
        today={today}
      />
    </main>
  )
}
