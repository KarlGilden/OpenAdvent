import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the OpenAdvent calendar shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'OpenAdvent' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Twenty-five little moments, waiting behind the doors.'),
    ).toBeVisible()
    expect(
      screen.getByRole('list', { name: 'Advent calendar days' }),
    ).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(25)
  })

  it('marks a selected temporary door as opened', async () => {
    const user = userEvent.setup()
    render(<App />)

    const door = screen.getByRole('button', { name: 'Day 7, unopened' })
    await user.click(door)

    expect(
      screen.getByRole('button', { name: 'Day 7, opened' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})

