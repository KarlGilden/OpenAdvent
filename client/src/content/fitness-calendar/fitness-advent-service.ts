import {
  AdventContentNotFoundError,
  parseAdventDay,
  type AdventDay,
} from '../../domain/advent'
import type { AdventService } from '../../services/interfaces/advent-service'
import exercises from './exercises.json'
import effortLevels from './effort-levels.json'

const MIN_EFFORT_LEVEL = 1
const MAX_EFFORT_LEVEL = 10

export type FitnessEffortContent = Readonly<
  Partial<Record<AdventDay, number>>
>

export interface FitnessExercise {
  readonly effortLevel: number
  readonly description: string
}

export class InvalidFitnessEffortError extends RangeError {
  readonly effortLevel: unknown

  constructor(effortLevel: unknown) {
    super('Fitness effort levels must be integers from 1 through 10.')
    this.name = 'InvalidFitnessEffortError'
    this.effortLevel = effortLevel
  }
}

export class InvalidFitnessExerciseError extends TypeError {
  constructor() {
    super('Fitness exercises need a description and an effort level from 1 through 10.')
    this.name = 'InvalidFitnessExerciseError'
  }
}

export class FitnessPlanNotFoundError extends Error {
  readonly effortLevel: number

  constructor(effortLevel: number) {
    super(`No exercise combination could reach effort level ${effortLevel}.`)
    this.name = 'FitnessPlanNotFoundError'
    this.effortLevel = effortLevel
  }
}

function isEffortLevel(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= MIN_EFFORT_LEVEL &&
    Number(value) <= MAX_EFFORT_LEVEL
  )
}

function isFitnessExercise(value: unknown): value is FitnessExercise {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<FitnessExercise>

  return (
    isEffortLevel(candidate.effortLevel) &&
    typeof candidate.description === 'string' &&
    candidate.description.trim() !== ''
  )
}

function canReachEffort(
  targetEffort: number,
  availableExercises: readonly FitnessExercise[],
): boolean {
  if (targetEffort === 0) {
    return true
  }

  const reachableEfforts = new Set([0])

  for (const exercise of availableExercises) {
    const currentEfforts = [...reachableEfforts]

    for (const currentEffort of currentEfforts) {
      const combinedEffort = currentEffort + exercise.effortLevel

      if (combinedEffort <= targetEffort) {
        reachableEfforts.add(combinedEffort)
      }
    }
  }

  return reachableEfforts.has(targetEffort)
}

function randomCandidateIndex(random: () => number, length: number): number {
  const value = random()

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('The fitness random source must return a value from 0 up to 1.')
  }

  return Math.floor(value * length)
}

function createFitnessPlan(
  targetEffort: number,
  catalog: readonly FitnessExercise[],
  random: () => number,
): readonly FitnessExercise[] {
  const availableExercises = [...catalog]
  const plan: FitnessExercise[] = []
  let remainingEffort = targetEffort

  while (remainingEffort > 0) {
    const candidates = availableExercises.flatMap((exercise, index) => {
      if (exercise.effortLevel > remainingEffort) {
        return []
      }

      const remainingExercises = availableExercises.filter(
        (_, exerciseIndex) => exerciseIndex !== index,
      )

      return canReachEffort(
        remainingEffort - exercise.effortLevel,
        remainingExercises,
      )
        ? [{ exercise, index }]
        : []
    })

    if (candidates.length === 0) {
      throw new FitnessPlanNotFoundError(targetEffort)
    }

    const candidate = candidates[randomCandidateIndex(random, candidates.length)]
    plan.push(candidate.exercise)
    availableExercises.splice(candidate.index, 1)
    remainingEffort -= candidate.exercise.effortLevel
  }

  return plan
}

function formatFitnessPlan(plan: readonly FitnessExercise[]): string {
  return plan.map((exercise) => `• ${exercise.description}`).join('\n')
}

export class FitnessAdventService implements AdventService {
  constructor(
    private readonly content: FitnessEffortContent = effortLevels,
    private readonly catalog: readonly FitnessExercise[] = exercises,
    private readonly random: () => number = Math.random,
  ) {}

  async openAdvent(advent: AdventDay): Promise<string> {
    const day = parseAdventDay(advent)
    const effortLevel = this.content[day]

    if (effortLevel === undefined) {
      throw new AdventContentNotFoundError(day)
    }

    if (!isEffortLevel(effortLevel)) {
      throw new InvalidFitnessEffortError(effortLevel)
    }

    if (!this.catalog.every(isFitnessExercise)) {
      throw new InvalidFitnessExerciseError()
    }

    return formatFitnessPlan(
      createFitnessPlan(effortLevel, this.catalog, this.random),
    )
  }
}
