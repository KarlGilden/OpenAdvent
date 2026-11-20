import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ADVENT_DAYS } from '../domain/advent'
import { AdventCalendarGrid } from './advent-calendar-grid'

describe('AdventCalendarGrid', () => {
  it('renders every advent day exactly once in calendar order', () => {
    render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[]}
        onOpenAdvent={vi.fn()}
      />,
    )

    const doors = screen.getAllByRole('button')

    expect(doors).toHaveLength(25)
    expect(doors.map((door) => door.textContent)).toEqual(
      ADVENT_DAYS.map((day) => `${day}Open day`),
    )
  })

  it('passes the selected day to its callback', async () => {
    const user = userEvent.setup()
    const onOpenAdvent = vi.fn()
    render(
      <AdventCalendarGrid
        days={ADVENT_DAYS}
        openedAdvents={[]}
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
        onOpenAdvent={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Day 3, opened' }),
    ).toHaveTextContent('Opened')
    expect(
      screen.getByRole('button', { name: 'Day 25, opened' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Day 4, unopened' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})
