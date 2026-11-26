import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { MemberCalendar } from '../types'

export function useCalendars() {
  const { sessionId = null } = useAuth()
  const request = useFetch()

  return useQuery({
    queryKey: queryKeys.memberships(sessionId),
    enabled: Boolean(sessionId),
    queryFn: ({ signal }) => request<MemberCalendar[]>({ path: '/api/advent', method: 'GET', signal }),
  })
}
