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
  SignOutButton: ({ children }: { children: ReactNode }) => children,
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
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible()
    expect(screen.getByText('ada@example.test')).toBeVisible()
    expect(fetchProfile).toHaveBeenCalledWith('/api/user', expect.objectContaining({
      headers: { Authorization: 'Bearer session-token' },
    }))
  })

  it('automatically submits the invitation as soon as the visitor signs in', async () => {
    const invitation = 'A'.repeat(43)
    const previousUrl = window.location.href
    window.history.replaceState(null, '', `/advent/join#${invitation}`)
    try {
      auth.sessionId = null
      fetchProfile.mockImplementation(async (path) => path === '/api/advent/join'
        ? new Response(null, { status: 404 })
        : Response.json({ name: 'Ada', email: 'ada@example.test' }))

      const { rerender } = render(<AdventPage path="/advent/join" />)
      expect(screen.getByText('Log in to accept this invitation.')).toBeVisible()
      expect(fetchProfile).not.toHaveBeenCalled()

      auth.sessionId = 'session-one'
      rerender(<AdventPage path="/advent/join" />)

      expect(await screen.findByRole('alert')).toHaveTextContent('This invitation is unavailable.')
      expect(fetchProfile.mock.calls.filter(([path]) => path === '/api/advent/join')).toHaveLength(1)
      expect(fetchProfile).toHaveBeenCalledWith('/api/advent/join', expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer session-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitation }),
      }))
    } finally {
      window.history.replaceState(null, '', previousUrl)
    }
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
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
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
    expect(screen.getByRole('link', { name: 'Family Advent' })).toHaveAttribute('href', '/advent/owned')
    expect(screen.getByText('Friends Advent')).toBeVisible()
    expect(fetchProfile).toHaveBeenCalledWith('/api/advent', expect.objectContaining({
      method: 'GET', headers: { Authorization: 'Bearer session-token' },
    }))
  })

  it('reveals a preloaded door while saving progress and disables doors absent from the response', async () => {
    const user = userEvent.setup()
    const localStorageWrite = vi.spyOn(Storage.prototype, 'setItem')
    let finishSaving: (response: Response) => void = () => {}
    const saveResponse = new Promise<Response>((resolve) => { finishSaving = resolve })
    fetchProfile.mockImplementation(async (path) => {
      if (path === '/api/user') return Response.json({ name: 'Ada', email: 'ada@example.test' })
      if (String(path).endsWith('/open')) return saveResponse
      return Response.json({
        id: 'shared', name: 'Shared Advent', year: 2020, isAdmin: false,
        days: [
          { day: 1, content: 'First surprise', openedAt: null },
          { day: 2, content: 'Saved surprise', openedAt: '2020-12-02T00:00:00.000Z' },
        ],
      })
    })
    render(<AdventPage path="/advent/calendar" adventId="shared" />)

    await screen.findByRole('heading', { name: 'Shared Advent 2020' })
    expect(screen.getAllByRole('button', { name: /^Day / })).toHaveLength(25)
    expect(screen.getByRole('button', { name: 'Day 3, locked' })).toBeDisabled()
    expect(screen.queryByText('First surprise')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Day 2, opened. Reveal again' }))
    expect(screen.getByText('Saved surprise')).toBeVisible()
    expect(fetchProfile).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Day 1, unopened' }))
    expect(screen.getByText('First surprise')).toBeVisible()
    expect(fetchProfile).toHaveBeenCalledTimes(3)
    expect(fetchProfile).toHaveBeenLastCalledWith('/api/advent/shared/days/1/open', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    }))
    expect(localStorageWrite).not.toHaveBeenCalled()
    localStorageWrite.mockRestore()
    finishSaving(new Response(null, { status: 204 }))
  })

  it('displays an error if the API rejects the request', async () => {
    fetchProfile.mockResolvedValue(new Response(null, { status: 401 }))

    render(<AccountControls />)

    expect(await screen.findByText('Could not load your profile.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Manage account' })).toBeVisible()
  })
})
