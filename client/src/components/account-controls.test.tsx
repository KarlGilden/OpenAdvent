import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountControls } from './account-controls'

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
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchProfile).toHaveBeenCalledTimes(2)
  })

  it('displays an error if the API rejects the request', async () => {
    fetchProfile.mockResolvedValue(new Response(null, { status: 401 }))

    render(<AccountControls />)

    expect(await screen.findByText('Could not load your profile.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Manage account' })).toBeVisible()
  })
})
