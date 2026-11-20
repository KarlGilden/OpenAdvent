import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { ComplimentAdventService } from './content/compliments-calendar/compliment-advent-service'
import { LocalStorageOpenedAdventStore } from './services/local-storage-opened-advent-store'
import type { OpenedAdventStore } from './services/interfaces/advent-store'

const TEST_TODAY = new Date(2026, 10, 20)

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the complete OpenAdvent calendar', async () => {
    render(<App today={TEST_TODAY} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'OpenAdvent' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Twenty-five little moments, waiting behind the doors.'),
    ).toBeVisible()

    expect(
      await screen.findByRole('list', { name: 'Advent calendar days' }),
    ).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(25)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your November Doors' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: 'Day 21, locked. Opens Nov 21',
      }),
    ).toBeDisabled()
  })

  it('opens a door with its real compliment and keeps focus in place', async () => {
    const user = userEvent.setup()
    render(<App today={TEST_TODAY} />)
    const door = await screen.findByRole('button', {
      name: 'Day 7, unopened',
    })

    await user.click(door)

    expect(
      await screen.findByRole('button', { name: 'Day 7, opened. Revisit' }),
    ).toHaveFocus()
    expect(
      screen.getByText('You handle challenges with remarkable strength.'),
    ).toBeVisible()
  })

  it('restores an opened door after a browser-style reload', async () => {
    const user = userEvent.setup()
    const adventService = new ComplimentAdventService()
    const firstStore = new LocalStorageOpenedAdventStore(window.localStorage)
    const firstRender = render(
      <App
        adventService={adventService}
        openedAdventStore={firstStore}
        today={TEST_TODAY}
      />,
    )
    await user.click(
      await screen.findByRole('button', { name: 'Day 12, unopened' }),
    )
    await screen.findByText('Your warmth makes every room feel a little cozier.')
    firstRender.unmount()

    const refreshedStore = new LocalStorageOpenedAdventStore(window.localStorage)
    render(
      <App
        adventService={adventService}
        openedAdventStore={refreshedStore}
        today={TEST_TODAY}
      />,
    )

    const restoredDoor = await screen.findByRole('button', {
      name: 'Day 12, opened. Reveal again',
    })
    expect(restoredDoor).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.queryByText('Your warmth makes every room feel a little cozier.'),
    ).not.toBeInTheDocument()

    await user.click(restoredDoor)
    expect(
      await screen.findByText(
        'Your warmth makes every room feel a little cozier.',
      ),
    ).toBeVisible()
  })

  it('keeps the calendar usable when saved progress cannot be restored', async () => {
    const unavailableStore: OpenedAdventStore = {
      loadOpenedAdvents: vi
        .fn<OpenedAdventStore['loadOpenedAdvents']>()
        .mockRejectedValue(new Error('Storage unavailable')),
      markAdventOpened: vi
        .fn<OpenedAdventStore['markAdventOpened']>()
        .mockRejectedValue(new Error('Storage unavailable')),
    }

    render(
      <App openedAdventStore={unavailableStore} today={TEST_TODAY} />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Progress Couldn’t Be Restored',
    )
    expect(
      screen.getByRole('list', { name: 'Advent calendar days' }),
    ).toBeVisible()
  })

  it('has no critical automated accessibility violations', async () => {
    const { container } = render(<App today={TEST_TODAY} />)
    await screen.findByRole('list', { name: 'Advent calendar days' })

    const canvasContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => null)
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    canvasContext.mockRestore()
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === 'critical',
    )

    expect(criticalViolations).toEqual([])
  })
})
