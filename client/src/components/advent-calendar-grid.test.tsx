import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ADVENT_DAYS } from '../domain/advent'
import { AdventCalendarGrid } from './advent-calendar-grid'

const END_OF_NOVEMBER_CALENDAR = new Date(2026, 10, 25)

describe('AdventCalendarGrid', () => {
  it('renders every advent day exactly once in calendar order', () => {
    render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[]}
        today={END_OF_NOVEMBER_CALENDAR}
        onOpenAdvent={vi.fn()}
      />,
    )

    const doors = document.querySelectorAll<HTMLButtonElement>('.advent-door')

    expect(doors).toHaveLength(25)
    ADVENT_DAYS.forEach((day, index) => {
      expect(doors[index]?.querySelector('.visually-hidden')).toHaveTextContent(
        `Day ${day}, unopened`,
      )
    })
  })

  it('passes the selected day to its callback', async () => {
    const user = userEvent.setup()
    const onOpenAdvent = vi.fn()
    render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[]}
        today={END_OF_NOVEMBER_CALENDAR}
        onOpenAdvent={onOpenAdvent}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Day 14, unopened' }))

    expect(onOpenAdvent).toHaveBeenCalledOnce()
    expect(onOpenAdvent).toHaveBeenCalledWith(14)
  })

  it('identifies opened days with text and pressed state', () => {
    render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[3, 25]}
        today={END_OF_NOVEMBER_CALENDAR}
        onOpenAdvent={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Day 3, opened. Reveal again' }),
    ).toHaveTextContent('Reveal Again')
    expect(
      screen.getByRole('button', { name: 'Day 25, opened. Reveal again' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Day 4, unopened' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('passes per-day loading, content, and error state to doors', () => {
    render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[2]}
        loadingAdvents={[1]}
        revealedContent={{ 2: 'A bright little surprise' }}
        errors={{ 3: 'The surprise is resting.' }}
        today={END_OF_NOVEMBER_CALENDAR}
        onOpenAdvent={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Day 1, opening' })).toBeDisabled()
    expect(screen.getByText('A bright little surprise')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Day 3, unavailable. Try again' }),
    ).toHaveTextContent('The surprise is resting.')
  })

  it('unlocks today and previous days while locking future days', async () => {
    const user = userEvent.setup()
    const onOpenAdvent = vi.fn()
    const { container } = render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[]}
        today={new Date(2026, 10, 20)}
        onOpenAdvent={onOpenAdvent}
      />,
    )

    const todayDoor = container.querySelector<HTMLButtonElement>(
      '.calendar__day:nth-child(20) .advent-door',
    )
    const futureDoor = container.querySelector<HTMLButtonElement>(
      '.calendar__day:nth-child(21) .advent-door',
    )

    if (!todayDoor || !futureDoor) {
      throw new Error('Expected the current and future advent doors to render')
    }

    expect(todayDoor).toBeEnabled()
    expect(futureDoor).toBeDisabled()
    expect(futureDoor).toHaveAccessibleName('Day 21, locked')

    await user.click(todayDoor)
    await user.click(futureDoor)

    expect(onOpenAdvent).toHaveBeenCalledOnce()
    expect(onOpenAdvent).toHaveBeenCalledWith(20)
  })
})
