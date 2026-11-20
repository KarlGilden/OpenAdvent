import { describe, expect, it } from 'vitest'
import { InvalidAdventDayError, type AdventDay } from '../../domain/advent'
import {
  LocalStorageOpenedAdventStore,
  OPENED_ADVENTS_STORAGE_KEY,
} from '../local-storage-opened-advent-store'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('LocalStorageOpenedAdventStore', () => {
  it('loads an empty safe state when no data has been stored', async () => {
    const store = new LocalStorageOpenedAdventStore(new MemoryStorage())

    await expect(store.loadOpenedAdvents()).resolves.toEqual([])
  })

  it('persists opened days across store instances', async () => {
    const storage = new MemoryStorage()
    const storeBeforeRefresh = new LocalStorageOpenedAdventStore(storage)

    await storeBeforeRefresh.markAdventOpened(18)

    const storeAfterRefresh = new LocalStorageOpenedAdventStore(storage)
    await expect(storeAfterRefresh.loadOpenedAdvents()).resolves.toEqual([18])
  })

  it('stores each opened day once in calendar order', async () => {
    const storage = new MemoryStorage()
    const store = new LocalStorageOpenedAdventStore(storage)

    await store.markAdventOpened(20)
    await store.markAdventOpened(3)
    await store.markAdventOpened(20)

    await expect(store.loadOpenedAdvents()).resolves.toEqual([3, 20])
    expect(storage.getItem(OPENED_ADVENTS_STORAGE_KEY)).toBe('[3,20]')
  })

  it.each(['not json', '{}', '[1, 0, 26]', '[1, "2", 3]'])(
    'recovers from malformed stored data: %s',
    async (storedValue) => {
      const storage = new MemoryStorage()
      storage.setItem(OPENED_ADVENTS_STORAGE_KEY, storedValue)
      const store = new LocalStorageOpenedAdventStore(storage)

      await expect(store.loadOpenedAdvents()).resolves.toEqual([])
    },
  )

  it('normalizes duplicate valid stored days', async () => {
    const storage = new MemoryStorage()
    storage.setItem(OPENED_ADVENTS_STORAGE_KEY, '[25,1,25,12]')
    const store = new LocalStorageOpenedAdventStore(storage)

    await expect(store.loadOpenedAdvents()).resolves.toEqual([1, 12, 25])
  })

  it('repairs malformed data when a valid day is opened', async () => {
    const storage = new MemoryStorage()
    storage.setItem(OPENED_ADVENTS_STORAGE_KEY, 'not json')
    const store = new LocalStorageOpenedAdventStore(storage)

    await store.markAdventOpened(7)

    expect(storage.getItem(OPENED_ADVENTS_STORAGE_KEY)).toBe('[7]')
  })

  it('rejects an invalid runtime day without changing storage', async () => {
    const storage = new MemoryStorage()
    const store = new LocalStorageOpenedAdventStore(storage)

    await expect(store.markAdventOpened(26 as AdventDay)).rejects.toBeInstanceOf(
      InvalidAdventDayError,
    )
    expect(storage.getItem(OPENED_ADVENTS_STORAGE_KEY)).toBeNull()
  })
})
