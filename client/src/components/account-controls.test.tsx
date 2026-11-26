import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountControls } from './account-controls'
import { AdventPage } from './advent-pages'

const auth = vi.hoisted(() => ({
  sessionId: null as string | null,
  getToken: vi.fn<() => Promise<string | null>>(),
}))

vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  Show: ({ children, when }: { children: ReactNode; when: string }) =>
    when === (auth.sessionId ? 'signed-in' : 'signed-out') ? children : null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => <button type="button">Manage account</button>,
  useAuth: () => auth,
}))

describe('AccountControls', () => {
  const fetchProfile = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'test-key')
    vi.stubGlobal('fetch', fetchProfile.mockReset())
    auth.sessionId = 'session-one'
    auth.getToken.mockReset().mockResolvedValue('session-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('shows the API profile using a Clerk bearer token', async () => {
    fetchProfile.mockResolvedValue(Response.json({
      id: 'local-id', name: 'Ada Lovelace', email: 'ada@example.test',
    }))

    render(<AccountControls />)

    expect(await screen.findByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByText('ada@example.test')).toBeVisible()
    expect(fetchProfile).toHaveBeenCalledWith('/api/user', expect.objectContaining({
      headers: { Authorization: 'Bearer session-token' },
    }))
  })

  it('clears the profile when the session changes and cancels when signing out', async () => {
    fetchProfile.mockResolvedValueOnce(Response.json({ name: 'Ada', email: 'ada@example.test' }))
    fetchProfile.mockImplementationOnce(() => new Promise(() => {}))
    const { rerender } = render(<AccountControls />)
    expect(await screen.findByText('Ada')).toBeVisible()

    auth.sessionId = 'session-two'
    rerender(<AccountControls />)
    expect(screen.queryByText('Ada')).toBeNull()
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(2))

    auth.sessionId = null
    rerender(<AccountControls />)
    expect(fetchProfile.mock.calls[1]?.[1]?.signal?.aborted).toBe(true)
    expect(screen.getByRole('button', { name: 'Log in' })).toBeVisible()
    expect(screen.queryByText('Create an Advent')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchProfile).toHaveBeenCalledTimes(2)
  })

  it('creates an Advent from its own page and shows the share link', async () => {
    fetchProfile.mockResolvedValueOnce(Response.json({ name: 'Ada', email: 'ada@example.test' }))
    fetchProfile.mockResolvedValueOnce(Response.json({
      id: 'advent-id', name: 'Family Advent', year: 2027, inviteUrl: '/advent/join#test-token',
    }, { status: 201 }))
    const user = userEvent.setup()
    render(<AdventPage path="/advent/new" />)

    await user.type(screen.getByLabelText('Advent name'), 'Family Advent')
    const year = screen.getByLabelText('Year')
    await user.clear(year)
    await user.type(year, '2027')
    await user.type(screen.getByLabelText('December 1', { exact: true }), 'First surprise')
    await user.type(screen.getByLabelText('December 25', { exact: true }), 'Last surprise')
    await user.click(screen.getByRole('button', { name: 'Create Advent' }))

    expect(await screen.findByText('Created Family Advent (2027).')).toBeVisible()
    expect(screen.getByLabelText('Invitation link')).toHaveValue(
      `${window.location.origin}/advent/join#test-token`,
    )
    expect(fetchProfile).toHaveBeenCalledWith('/api/advent', expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer session-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Family Advent', year: 2027,
        contents: ['First surprise', ...Array<string>(23).fill(''), 'Last surprise'],
      }),
    }))
  })

  it('displays calendars returned for the signed-in member', async () => {
    fetchProfile.mockImplementation(async (path) => path === '/api/user'
      ? Response.json({ name: 'Ada', email: 'ada@example.test' })
      : Response.json([
        { id: 'owned', name: 'Family Advent', year: 2027 },
        { id: 'joined', name: 'Friends Advent', year: 2026 },
      ]))
    render(<AdventPage path="/advent" />)

    expect(await screen.findByText('Family Advent')).toBeVisible()
    expect(screen.getByText('Friends Advent')).toBeVisible()
    expect(fetchProfile).toHaveBeenCalledWith('/api/advent', expect.objectContaining({
      method: 'GET', headers: { Authorization: 'Bearer session-token' },
    }))
  })

  it('displays an error if the API rejects the request', async () => {
    fetchProfile.mockResolvedValue(new Response(null, { status: 401 }))

    render(<AccountControls />)

    expect(await screen.findByText('Could not load your profile.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Manage account' })).toBeVisible()
  })
})
