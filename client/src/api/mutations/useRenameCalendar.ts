import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { CalendarSummary } from '../types'

export function useRenameCalendar(adventId: string) {
  const { sessionId = null } = useAuth()
  const client = useQueryClient()
  const request = useFetch()

  return useMutation({
    mutationFn: (name: string) =>
      request<CalendarSummary>({ path: `/api/advent/${encodeURIComponent(adventId)}`, method: 'PATCH', body: { name } }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.memberships(sessionId) }),
        client.invalidateQueries({ queryKey: queryKeys.calendar(sessionId, adventId) }),
      ])
    },
  })
}
