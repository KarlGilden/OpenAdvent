import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { useFetch } from '../useFetch'
import type { CalendarView } from '../types'

export function useCalendar(adventId: string, timeZone: string) {
  const { sessionId = null } = useAuth()
  const request = useFetch()

  return useQuery({
    queryKey: queryKeys.calendarView(sessionId, adventId, timeZone),
    enabled: Boolean(sessionId && adventId && timeZone),
    queryFn: ({ signal }) => request<CalendarView>({
      path: `/api/advent/${encodeURIComponent(adventId)}?${new URLSearchParams({ timeZone })}`,
      method: 'GET',
      signal,
    }),
  })
}
