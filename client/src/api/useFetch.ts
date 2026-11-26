import { useSession } from '@clerk/react'
import type { RequestOptions } from './types'

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function errorFromResponse(status: number, data: unknown) {
  const error = data && typeof data === 'object' && 'error' in data ? data.error : null
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
  const message = error && typeof error === 'object' && 'message' in error ? error.message : null
  return new ApiError(
    status,
    typeof code === 'string' ? code : 'HTTP_ERROR',
    typeof message === 'string' && message ? message : `Request failed with status ${status}.`,
  )
}

export function useFetch() {
  const { session } = useSession()

  return async function request<T = void>({ path, method, body, signal }: RequestOptions): Promise<T> {
    signal?.throwIfAborted()
    const token = await session?.getToken()
    signal?.throwIfAborted()
    if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Log in again to continue.')

    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal,
    })

    if (!response.ok) throw errorFromResponse(response.status, await response.json().catch(() => null))
    return (response.status === 204 ? undefined : await response.json()) as T
  }
}
