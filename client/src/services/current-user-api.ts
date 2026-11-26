export interface CurrentUserProfile {
  readonly name: string
  readonly email: string
}

export async function fetchCurrentUser(
  token: string,
  signal: AbortSignal,
): Promise<CurrentUserProfile> {
  const response = await fetch('/api/user', {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal,
  })
  if (!response.ok) throw new Error('User API request failed')

  const data: unknown = await response.json()
  if (
    !data ||
    typeof data !== 'object' ||
    !('name' in data) ||
    typeof data.name !== 'string' ||
    !('email' in data) ||
    typeof data.email !== 'string'
  ) {
    throw new Error('Invalid user API response')
  }
  return { name: data.name, email: data.email }
}
