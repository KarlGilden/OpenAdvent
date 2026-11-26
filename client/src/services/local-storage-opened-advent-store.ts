import {
  ADVENT_DAYS,
  isAdventDay,
  parseAdventDay,
  type AdventDay,
} from '../domain/advent'
import type { CalendarType } from '../content/calendar-registry'
import type { OpenedAdventStore } from './interfaces/advent-store'

const OPENED_ADVENTS_STORAGE_KEY_PREFIX = 'open-advent:v1:opened-advents'

export function openedAdventsStorageKey(calendarType: CalendarType): string {
  return `${OPENED_ADVENTS_STORAGE_KEY_PREFIX}:${calendarType}`
}

export const OPENED_ADVENTS_STORAGE_KEY =
  openedAdventsStorageKey('compliments')

type AdventStorage = Pick<Storage, 'getItem' | 'setItem'>

function parseStoredAdvents(value: string | null): readonly AdventDay[] {
  if (value === null) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(value)

    if (!Array.isArray(parsed) || !parsed.every(isAdventDay)) {
      return []
    }

    return ADVENT_DAYS.filter((day) => parsed.includes(day))
  } catch {
    return []
  }
}

/**
 * Persists opened advents in the current browser.
 *
 * Missing or malformed stored values resolve to an empty list. Valid stored
 * values are returned once each in calendar order.
 */
export class LocalStorageOpenedAdventStore implements OpenedAdventStore {
  private readonly storageKey: string

  constructor(
    private readonly storage: AdventStorage = globalThis.localStorage,
    calendarType: CalendarType = 'compliments',
  ) {
    this.storageKey = openedAdventsStorageKey(calendarType)
  }

  async loadOpenedAdvents(): Promise<readonly AdventDay[]> {
    return parseStoredAdvents(this.storage.getItem(this.storageKey))
  }

  async markAdventOpened(advent: AdventDay): Promise<void> {
    const day = parseAdventDay(advent)
    const openedAdvents = await this.loadOpenedAdvents()

    if (openedAdvents.includes(day)) {
      return
    }

    const updatedAdvents = ADVENT_DAYS.filter(
      (candidate) => candidate === day || openedAdvents.includes(candidate),
    )

    this.storage.setItem(this.storageKey, JSON.stringify(updatedAdvents))
  }
}
