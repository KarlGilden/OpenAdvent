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
    ADVENT_DAYS.forEach((day, index) => {
      expect(doors[index]).toHaveAccessibleName(`Day ${day}, unopened`)
    })
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
        onOpenAdvent={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Day 1, opening' })).toBeDisabled()
    expect(screen.getByText('A bright little surprise')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Day 3, unavailable. Try again' }),
    ).toHaveTextContent('The surprise is resting.')
  })
})
