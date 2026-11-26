import { describe, expect, it } from 'vitest'
import complimentsCalendar from './compliments-calendar/calendar.json'
import fitnessCalendar from './fitness-calendar/calendar.json'
import {
  CALENDARS,
  findCalendar,
  isCalendarType,
} from './calendar-registry'

describe('calendar registry', () => {
  it('sources the selectable calendar names from calendar content', () => {
    expect(CALENDARS.map(({ type, name }) => ({ type, name }))).toEqual([
      { type: 'compliments', name: complimentsCalendar.name },
      { type: 'fitness', name: fitnessCalendar.name },
    ])
  })

  it('finds registered calendars and rejects unknown selector values', () => {
    expect(findCalendar('fitness').name).toBe('Fitness')
    expect(isCalendarType('compliments')).toBe(true)
    expect(isCalendarType('unknown')).toBe(false)
  })
})
