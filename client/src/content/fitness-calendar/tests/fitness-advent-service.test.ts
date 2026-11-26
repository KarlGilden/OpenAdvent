import { describe, expect, it } from 'vitest'
import {
  ADVENT_DAYS,
  AdventContentNotFoundError,
  InvalidAdventDayError,
  type AdventDay,
} from '../../../domain/advent'
import exercises from '../exercises.json'
import effortLevels from '../effort-levels.json'
import {
  FitnessAdventService,
  FitnessPlanNotFoundError,
  InvalidFitnessEffortError,
  InvalidFitnessExerciseError,
  type FitnessExercise,
} from '../fitness-advent-service'

function planDescriptions(plan: string): readonly string[] {
  return plan.split('\n').map((line) => line.replace(/^• /, ''))
}

describe('FitnessAdventService', () => {
  it.each(ADVENT_DAYS)(
    'returns a unique exercise list totaling the effort for day %s',
    async (day) => {
      const service = new FitnessAdventService(
        effortLevels,
        exercises,
        () => 0.37,
      )
      const plan = await service.openAdvent(day)
      const descriptions = planDescriptions(plan)
      const exercisesByDescription = new Map(
        exercises.map((exercise) => [exercise.description, exercise]),
      )
      const totalEffort = descriptions.reduce(
        (total, description) =>
          total + (exercisesByDescription.get(description)?.effortLevel ?? 0),
        0,
      )

      expect(plan).toMatch(/^• /)
      expect(new Set(descriptions).size).toBe(descriptions.length)
      expect(totalEffort).toBe(effortLevels[day])
    },
  )

  it('uses the random source while preserving an exact effort total', async () => {
    const catalog: readonly FitnessExercise[] = [
      { effortLevel: 1, description: 'One A' },
      { effortLevel: 1, description: 'One B' },
      { effortLevel: 2, description: 'Two' },
      { effortLevel: 3, description: 'Three' },
      { effortLevel: 5, description: 'Five' },
    ]

    await expect(
      new FitnessAdventService({ 1: 5 }, catalog, () => 0).openAdvent(1),
    ).resolves.toBe('• One A\n• One B\n• Three')
    await expect(
      new FitnessAdventService({ 1: 5 }, catalog, () => 0.999).openAdvent(1),
    ).resolves.toBe('• Five')
  })

  it('rejects an invalid runtime day', async () => {
    const service = new FitnessAdventService()

    await expect(service.openAdvent(0 as AdventDay)).rejects.toBeInstanceOf(
      InvalidAdventDayError,
    )
  })

  it('rejects a missing or invalid effort level', async () => {
    await expect(
      new FitnessAdventService({}).openAdvent(1),
    ).rejects.toBeInstanceOf(AdventContentNotFoundError)
    await expect(
      new FitnessAdventService({ 1: 11 }).openAdvent(1),
    ).rejects.toBeInstanceOf(InvalidFitnessEffortError)
  })

  it('rejects invalid exercises and catalogs that cannot hit the target', async () => {
    await expect(
      new FitnessAdventService(
        { 1: 1 },
        [{ effortLevel: 0, description: 'Invalid' }],
      ).openAdvent(1),
    ).rejects.toBeInstanceOf(InvalidFitnessExerciseError)
    await expect(
      new FitnessAdventService(
        { 1: 1 },
        [{ effortLevel: 2, description: 'Too much effort' }],
      ).openAdvent(1),
    ).rejects.toBeInstanceOf(FitnessPlanNotFoundError)
  })

  it('rejects an invalid random source', async () => {
    await expect(
      new FitnessAdventService(
        { 1: 1 },
        [{ effortLevel: 1, description: 'One' }],
        () => 1,
      ).openAdvent(1),
    ).rejects.toThrow('must return a value from 0 up to 1')
  })
})
