import type { AdventDay } from '../domain/advent'

interface SimpleAdventDoorProps {
  readonly day: AdventDay
  readonly isOpened: boolean
  readonly onOpen: (day: AdventDay) => void
}

export function SimpleAdventDoor({
  day,
  isOpened,
  onOpen,
}: SimpleAdventDoorProps) {
  return (
    <button
      className="advent-door"
      data-opened={isOpened}
      type="button"
      aria-label={`Day ${day}, ${isOpened ? 'opened' : 'unopened'}`}
      aria-pressed={isOpened}
      onClick={() => onOpen(day)}
    >
      <span className="advent-door__number">{day}</span>
      <span className="advent-door__status">
        {isOpened ? (
          <>
            <span className="advent-door__check" aria-hidden="true">
              ✓
            </span>
            Opened
          </>
        ) : (
          <>
            <span className="advent-door__knob" aria-hidden="true" />
            Open day
          </>
        )}
      </span>
    </button>
  )
}
