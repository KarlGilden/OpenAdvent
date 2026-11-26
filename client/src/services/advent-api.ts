export interface CalendarSummary {
  id: string
  name: string
  year: number
}

export interface CalendarView extends CalendarSummary {
  isAdmin: boolean
  days: Array<{ day: number; content: string; openedAt: string | null }>
}

async function adventRequest<T>(
  token: string,
  path: string,
  options: { body?: object; signal?: AbortSignal; notFoundMessage?: string } = {},
): Promise<T> {
  const { body, signal } = options
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal,
  })
  if (response.status === 401) throw new AdventApiError('Log in again to continue.')
  if (response.status === 404) throw new AdventApiError(options.notFoundMessage ?? 'This invitation is unavailable.')
  if (response.status === 400) throw new AdventApiError('Check the information and try again.')
  if (!response.ok) throw new Error('Advent API request failed')
  return response.json() as Promise<T>
}

export class AdventApiError extends Error {}

export function getAdvent(token: string, adventId: string, timeZone: string, signal: AbortSignal) {
  const query = new URLSearchParams({ timeZone })
  return adventRequest<CalendarView>(token, `/api/advent/${encodeURIComponent(adventId)}?${query}`, {
    signal, notFoundMessage: 'This calendar is unavailable.',
  })
}

export async function saveOpenedDoor(token: string, adventId: string, day: number, timeZone: string) {
  const response = await fetch(`/api/advent/${encodeURIComponent(adventId)}/days/${day}/open`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeZone }),
    redirect: 'error',
  })
  if (!response.ok) throw new Error('Door opening could not be saved')
}

export function createAdvent(token: string, name: string, year: number, contents: string[]) {
  return adventRequest<CalendarSummary & { inviteUrl: string }>(token, '/api/advent', {
    body: { name, year, contents },
  })
}

export function listAdvents(token: string, signal: AbortSignal) {
  return adventRequest<CalendarSummary[]>(token, '/api/advent', { signal })
}

export function joinAdvent(token: string, invitation: string) {
  return adventRequest<{ adventId: string }>(token, '/api/advent/join', {
    body: { token: invitation },
  })
}
