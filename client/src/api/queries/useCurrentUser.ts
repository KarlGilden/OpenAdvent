import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { CurrentUserProfile } from '../types'

export function useCurrentUser() {
  const { sessionId = null } = useAuth()
  const request = useFetch()

  return useQuery<CurrentUserProfile>({
    queryKey: queryKeys.profile(sessionId),
    enabled: Boolean(sessionId),
    queryFn: async ({ signal }) => {
      const data = await request<unknown>({ path: '/api/user', method: 'GET', signal })
      if (!data || typeof data !== 'object' ||
        !('name' in data) || typeof data.name !== 'string' ||
        !('email' in data) || typeof data.email !== 'string') {
        throw new Error('Invalid user API response')
      }
      return { name: data.name, email: data.email }
    },
  })
}
