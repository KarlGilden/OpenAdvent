import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdventService } from '../services/interfaces/advent-service'
import type { OpenedAdventStore } from '../services/interfaces/advent-store'
import { useCalendarController } from './use-calendar-controller'

function createDependencies(options?: {
  openedAdvents?: Awaited<ReturnType<OpenedAdventStore['loadOpenedAdvents']>>
  content?: string
}) {
  const openAdvent = vi
    .fn<AdventService['openAdvent']>()
    .mockResolvedValue(options?.content ?? 'A cheerful surprise')
  const loadOpenedAdvents = vi
    .fn<OpenedAdventStore['loadOpenedAdvents']>()
    .mockResolvedValue(options?.openedAdvents ?? [])
  const markAdventOpened = vi
    .fn<OpenedAdventStore['markAdventOpened']>()
    .mockResolvedValue(undefined)

  return {
    adventService: { openAdvent } satisfies AdventService,
    openedAdventStore: {
      loadOpenedAdvents,
      markAdventOpened,
    } satisfies OpenedAdventStore,
    openAdvent,
    loadOpenedAdvents,
    markAdventOpened,
  }
}

async function waitForInitialization(
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useCalendarController>, unknown>
  >['result'],
) {
  await waitFor(() => expect(result.current.isLoading).toBe(false))
}

describe('useCalendarController', () => {
  it('restores previously opened advents during initialization', async () => {
    const dependencies = createDependencies({ openedAdvents: [2, 11, 24] })
    const { result } = renderHook(() =>
      useCalendarController(
        dependencies.adventService,
        dependencies.openedAdventStore,
      ),
    )

    expect(result.current.isLoading).toBe(true)
    await waitForInitialization(result)

    expect(result.current.days).toHaveLength(25)
    expect(result.current.openedAdvents).toEqual([2, 11, 24])
    expect(result.current.error).toBeNull()
  })

  it('reveals, opens, and persists a day after content succeeds', async () => {
    const dependencies = createDependencies({ content: 'You are wonderful' })
    const { result } = renderHook(() =>
      useCalendarController(
        dependencies.adventService,
        dependencies.openedAdventStore,
      ),
    )
    await waitForInitialization(result)

    await act(async () => result.current.openAdvent(6))

    expect(dependencies.openAdvent).toHaveBeenCalledWith(6)
    expect(result.current.revealedContent[6]).toBe('You are wonderful')
    expect(result.current.openedAdvents).toEqual([6])
    expect(dependencies.markAdventOpened).toHaveBeenCalledWith(6)
    expect(result.current.error).toBeNull()
  })

  it('reopens a day without duplicating its opened state', async () => {
    const dependencies = createDependencies({ openedAdvents: [9] })
    dependencies.openAdvent
      .mockResolvedValueOnce('First reveal')
      .mockResolvedValueOnce('Fresh reveal')
    const { result } = renderHook(() =>
      useCalendarController(
        dependencies.adventService,
        dependencies.openedAdventStore,
      ),
    )
    await waitForInitialization(result)

    await act(async () => result.current.openAdvent(9))
    await act(async () => result.current.openAdvent(9))

    expect(result.current.openedAdvents).toEqual([9])
    expect(result.current.revealedContent[9]).toBe('Fresh reveal')
    expect(dependencies.openAdvent).toHaveBeenCalledTimes(2)
  })

  it('keeps a failed day retryable and exposes a displayable error', async () => {
    const dependencies = createDependencies({ content: 'Recovered content' })
    dependencies.openAdvent.mockRejectedValueOnce(new Error('Content unavailable'))
    const { result } = renderHook(() =>
      useCalendarController(
        dependencies.adventService,
        dependencies.openedAdventStore,
      ),
    )
    await waitForInitialization(result)

    await act(async () => result.current.openAdvent(4))

    expect(result.current.openedAdvents).toEqual([])
    expect(result.current.revealedContent[4]).toBeUndefined()
    expect(result.current.error).toContain('Content unavailable')
    expect(dependencies.markAdventOpened).not.toHaveBeenCalled()

    await act(async () => result.current.openAdvent(4))

    expect(result.current.openedAdvents).toEqual([4])
    expect(result.current.revealedContent[4]).toBe('Recovered content')
    expect(result.current.error).toBeNull()
  })

  it('reports a restore failure and finishes initialization safely', async () => {
    const dependencies = createDependencies()
    dependencies.loadOpenedAdvents.mockRejectedValue(
      new Error('Storage unavailable'),
    )
    const { result } = renderHook(() =>
      useCalendarController(
        dependencies.adventService,
        dependencies.openedAdventStore,
      ),
    )

    await waitForInitialization(result)

    expect(result.current.openedAdvents).toEqual([])
    expect(result.current.error).toContain('Storage unavailable')
  })
})
