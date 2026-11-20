import { AdventCalendarGrid } from './components/advent-calendar-grid'
import { ComplimentAdventService } from './content/compliments-calendar/compliment-advent-service'
import { useCalendarController } from './controllers/use-calendar-controller'
import { LocalStorageOpenedAdventStore } from './services/local-storage-opened-advent-store'
import type { OpenedAdventStore } from './services/interfaces/advent-store'
import type { AdventService } from './services/interfaces/advent-service'

const defaultAdventService = new ComplimentAdventService()

function createDefaultOpenedAdventStore(): OpenedAdventStore {
  try {
    return new LocalStorageOpenedAdventStore()
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

const defaultOpenedAdventStore = createDefaultOpenedAdventStore()

export interface AppProps {
  readonly adventService?: AdventService
  readonly openedAdventStore?: OpenedAdventStore
}

export function App({
  adventService = defaultAdventService,
  openedAdventStore = defaultOpenedAdventStore,
}: AppProps = {}) {
  const calendar = useCalendarController(adventService, openedAdventStore)

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
      </header>

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
                The compliment is ready, but this browser may forget the door
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
            onOpenAdvent={calendar.openAdvent}
          />
        </>
      )}
    </main>
  )
}
