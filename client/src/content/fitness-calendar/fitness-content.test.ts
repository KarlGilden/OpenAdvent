import { describe, expect, it } from 'vitest'
import { ADVENT_DAYS } from '../../domain/advent'
import exercises from './exercises.json'
import effortLevels from './effort-levels.json'

describe('fitness advent content', () => {
  it('contains one valid effort level for every advent day', () => {
    expect(Object.keys(effortLevels)).toEqual(ADVENT_DAYS.map(String))

    for (const day of ADVENT_DAYS) {
      const effortLevel = effortLevels[String(day) as keyof typeof effortLevels]

      expect(Number.isInteger(effortLevel)).toBe(true)
      expect(effortLevel).toBeGreaterThanOrEqual(1)
      expect(effortLevel).toBeLessThanOrEqual(10)
    }
  })

  it('contains unique, display-ready exercises with valid effort levels', () => {
    const descriptions = new Set<string>()

    for (const exercise of exercises) {
      expect(Number.isInteger(exercise.effortLevel)).toBe(true)
      expect(exercise.effortLevel).toBeGreaterThanOrEqual(1)
      expect(exercise.effortLevel).toBeLessThanOrEqual(10)
      expect(exercise.description.trim()).not.toBe('')
      descriptions.add(exercise.description)
    }

    expect(descriptions.size).toBe(exercises.length)
  })
})
