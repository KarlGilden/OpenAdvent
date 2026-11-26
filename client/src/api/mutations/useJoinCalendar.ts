import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { JoinedCalendar } from '../types'

export function useJoinCalendar() {
  const { sessionId = null } = useAuth()
  const client = useQueryClient()
  const request = useFetch()

  return useMutation({
    mutationFn: (token: string) =>
      request<JoinedCalendar>({ path: '/api/advent/join', method: 'POST', body: { token } }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.memberships(sessionId) }),
  })
}
