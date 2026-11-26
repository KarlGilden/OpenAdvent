export interface CalendarSummary {
  id: string
  name: string
  year: number
}

async function adventRequest<T>(
  token: string,
  path: string,
  options: { body?: object; signal?: AbortSignal } = {},
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
  if (response.status === 404) throw new AdventApiError('This invitation is unavailable.')
  if (response.status === 400) throw new AdventApiError('Check the information and try again.')
  if (!response.ok) throw new Error('Advent API request failed')
  return response.json() as Promise<T>
}

export class AdventApiError extends Error {}

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
