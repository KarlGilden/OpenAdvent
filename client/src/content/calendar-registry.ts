import complimentsCalendar from './compliments-calendar/calendar.json'
import { ComplimentAdventService } from './compliments-calendar/compliment-advent-service'
import fitnessCalendar from './fitness-calendar/calendar.json'
import { FitnessAdventService } from './fitness-calendar/fitness-advent-service'
import type { AdventService } from '../services/interfaces/advent-service'

export type CalendarType = 'compliments' | 'fitness'

export interface CalendarDefinition {
  readonly type: CalendarType
  readonly name: string
  readonly service: AdventService
}

export const CALENDARS: readonly CalendarDefinition[] = [
  {
    type: 'compliments',
    name: complimentsCalendar.name,
    service: new ComplimentAdventService(),
  },
  {
    type: 'fitness',
    name: fitnessCalendar.name,
    service: new FitnessAdventService(),
  },
]

export const DEFAULT_CALENDAR_TYPE: CalendarType = 'compliments'

export function findCalendar(type: CalendarType): CalendarDefinition {
  const calendar = CALENDARS.find((candidate) => candidate.type === type)

  if (!calendar) {
    throw new Error(`Unknown calendar type: ${type}`)
  }

  return calendar
}

export function isCalendarType(value: string): value is CalendarType {
  return CALENDARS.some((calendar) => calendar.type === value)
}
